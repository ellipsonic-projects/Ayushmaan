import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";

import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnConsultantProfileId } from "../lib/callerProfile";
import { buildConsultantContext } from "../lib/workflow-context";
import { enqueue, WORKFLOW_ADVANCE_QUEUE } from "../queue/pgmq";

// Mounted at /api/tenants/:tenantId/workflows. Standard tenant-isolation RLS
// (schema §4.1) applies — unlike workflow_templates, there's no scope-based
// visibility split, so every CONSULTANT/TENANT_ADMIN in the tenant can see
// every workflow. Scoping rules:
//   • Creation is role-locked to one scope each: CONSULTANT always creates a
//     PERSONAL workflow for themselves (never TENANT/COMMUNITY, regardless
//     of what's in the request body); TENANT_ADMIN always creates
//     TENANT-scoped (organization) workflows; SUPER_ADMIN always creates
//     COMMUNITY workflows usable across every tenant. See the POST handler.
//   • Once created, everything about actually *operating* a TENANT/COMMUNITY
//     workflow — editing its name/graph, publishing, archiving, running,
//     pausing, resuming — belongs to CONSULTANTs, not the TENANT_ADMIN/
//     SUPER_ADMIN who created it; the creating role's job ends at creation.
//     See requireWorkflowManagePermission / requirePauseResumePermission.
//   • A PERSONAL workflow only ever has one relevant person — its owning
//     CONSULTANT — who alone can edit/publish/archive/run/pause/resume it.
//   • Pausing/resuming a shared TENANT/COMMUNITY workflow never touches
//     workflows.status at all: every CONSULTANT's pause/resume upserts/
//     removes their own WorkflowOptOut row instead (same effect as the
//     dedicated opt-out endpoints below), so one consultant pausing/resuming
//     never affects another's — see requirePauseResumePermission. A PERSONAL
//     workflow's owner does flip real workflows.status, since they're the
//     only one it ever runs for.
//   • Manually running a workflow (POST .../run) follows the same opt-out
//     rule: any CONSULTANT may run a TENANT/COMMUNITY workflow as long as
//     they haven't opted (paused) themselves out of it; a PERSONAL workflow
//     stays owner-only, since nobody else has a reason to run it.
//   • Deleting is otherwise off-limits: a SUPER_ADMIN may delete any
//     workflow, any scope; a TENANT_ADMIN may additionally delete a
//     CONSULTANT's PERSONAL workflow within their own tenant only (never a
//     TENANT/COMMUNITY one, including their own TENANT-scoped creation).
//     Nobody else can delete a workflow at all — see the DELETE handler.
export const workflowsRouter: Router = Router({ mergeParams: true });
workflowsRouter.use(requireTenantMatch);
workflowsRouter.use(requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));

const NODE_TYPES = [
  "TRIGGER",
  "SEND_EMAIL",
  "CREATE_TASK",
  "CREATE_COMMITMENT",
  "SEND_INTAKE_FORM",
  "WAIT",
  "CONDITION",
  "BRANCH",
  "CUSTOM_ACTION",
] as const;

// WorkflowGraph shape (packages/types/src/workflow.ts), validated server-side
// before it's persisted to workflows.graph (Sprint 5.5.1 item 7) — each
// node's data.config is checked against its exact node-type schema via the
// discriminated union, not just "some object".
const graphNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(NODE_TYPES),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
      nodeType: z.enum(NODE_TYPES),
      label: z.string().min(1),
      config: z.record(z.unknown()),
    }),
  })
  .refine((node) => node.type === node.data.nodeType, {
    message: "node.type and node.data.nodeType must match",
  });

const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
});

const workflowGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

async function findWorkflow(tx: Prisma.TransactionClient, workflowId: string) {
  const workflow = await tx.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.deletedAt) {
    throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
  }
  return workflow;
}

// Owning user only. createdByUserId (not consultantId) is the ownership
// reference so this works identically for a CONSULTANT's own PERSONAL
// workflow and a TENANT_ADMIN's/SUPER_ADMIN's own TENANT/COMMUNITY one — a
// TENANT_ADMIN/SUPER_ADMIN carries no ConsultantProfile to compare against.
// Only ever used for PERSONAL now — see requireWorkflowManagePermission /
// requirePauseResumePermission below for TENANT/COMMUNITY.
function requireOwnWorkflow(req: TenantScopedRequest, workflow: { createdByUserId: string }) {
  if (req.user!.id !== workflow.createdByUserId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_WORKFLOW");
  }
}

// Edit/publish/archive check (name/graph changes, and any status transition
// other than pause/resume — see PAUSE_RESUME_TRANSITIONS below). PERSONAL is
// owner-only, since it only ever "belongs" to its creating CONSULTANT. A
// TENANT/COMMUNITY workflow's creator (TENANT_ADMIN/SUPER_ADMIN) only ever
// creates the shell — everything about actually building/running it belongs
// to CONSULTANTs from then on, so any CONSULTANT may manage it regardless of
// who created it, and the creating TENANT_ADMIN/SUPER_ADMIN is rejected here.
function requireWorkflowManagePermission(
  req: TenantScopedRequest,
  workflow: { createdByUserId: string; scope: string }
) {
  if (workflow.scope === "PERSONAL") {
    requireOwnWorkflow(req, workflow);
    return;
  }
  if (req.user!.role !== "CONSULTANT") {
    throw new AppError(403, "Forbidden", "CONSULTANT_ONLY");
  }
}

// Pause/resume check — same split as requireWorkflowManagePermission above:
// PERSONAL is owner-only (the PATCH handler flips real workflows.status for
// them, since they're the only one it ever runs for); TENANT/COMMUNITY is
// CONSULTANT-only (any CONSULTANT, not gated by creation — the PATCH handler
// never flips real workflows.status for these, it upserts/removes the
// caller's own WorkflowOptOut row instead, so one consultant pausing/
// resuming never affects another's). TENANT_ADMIN/SUPER_ADMIN — the creating
// role — has no pause/resume power here at all, same as manage permission.
function requirePauseResumePermission(
  req: TenantScopedRequest,
  workflow: { createdByUserId: string; scope: string }
) {
  requireWorkflowManagePermission(req, workflow);
}

// Adds an `isOwn` flag the UI uses to know whether the caller created this
// workflow (still meaningful for PERSONAL, where it gates every action; for
// TENANT/COMMUNITY it's informational only — requireWorkflowManagePermission
// is the real enforcement there, and it's role-based, not ownership-based).
function withOwnership<T extends { createdByUserId: string }>(workflow: T, callerUserId: string) {
  return { ...workflow, isOwn: workflow.createdByUserId === callerUserId };
}

// Consultant-only — a TENANT_ADMIN carries no ConsultantProfile so can never
// have an opt-out row.
async function getOwnOptedOutWorkflowIds(
  tx: Prisma.TransactionClient,
  req: TenantScopedRequest
): Promise<Set<string>> {
  if (req.user!.role !== "CONSULTANT") return new Set();
  const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
  if (!consultantId) return new Set();
  const optOuts = await tx.workflowOptOut.findMany({
    where: { consultantId },
    select: { workflowId: true },
  });
  return new Set(optOuts.map((o) => o.workflowId));
}

// GET /tenants/:tenantId/workflows — list view: name, status, trigger type,
// last run (Sprint 5.5.3 item 2). For a CONSULTANT, "last run" means their
// own last run of a shared TENANT/COMMUNITY workflow, not whichever
// consultant happened to run it most recently — every run's context carries
// consultant.id (buildCaseContext/buildConsultantContext), which is how
// enqueueEventTriggers/sweepScheduledWorkflows already identify whose run is
// whose, so this filters on that same JSON path instead of adding a column.
// TENANT_ADMIN/SUPER_ADMIN have no consultant identity of their own, so they
// keep seeing the workflow's overall most recent run. A CONSULTANT also
// never sees another consultant's PERSONAL workflow here — it's fully inert
// to them (requireWorkflowManagePermission is owner-only for PERSONAL, so
// there'd be nothing they could do with it anyway) — every TENANT/COMMUNITY
// workflow still shows regardless of who created it.
workflowsRouter.get("/", async (req: TenantScopedRequest, res: Response) => {
  const { workflows, optedOutIds } = await withTenantContext(req.tenantContext!, async (tx) => {
    const callerConsultantId =
      req.user!.role === "CONSULTANT" ? await getOwnConsultantProfileId(tx, req.user!.id) : null;

    const workflows = await tx.workflow.findMany({
      where: {
        deletedAt: null,
        ...(req.user!.role === "CONSULTANT"
          ? { OR: [{ scope: { not: "PERSONAL" } }, { createdByUserId: req.user!.id }] }
          : {}),
      },
      include: {
        runs: {
          where: callerConsultantId
            ? { context: { path: ["consultant", "id"], equals: callerConsultantId } }
            : undefined,
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const optedOutIds = await getOwnOptedOutWorkflowIds(tx, req);
    return { workflows, optedOutIds };
  });

  res.json({
    data: workflows.map(({ runs, ...workflow }) => ({
      ...withOwnership(workflow, req.user!.id),
      optedOut: optedOutIds.has(workflow.id),
      lastRun: runs[0] ? { status: runs[0].status, createdAt: runs[0].createdAt } : null,
    })),
  });
});

// GET /tenants/:tenantId/workflows/:workflowId — full record including graph,
// for the canvas page. A CONSULTANT hitting another consultant's PERSONAL
// workflow directly by URL gets the same 404 as the list view hides it
// behind — see the GET / handler above.
workflowsRouter.get("/:workflowId", async (req: TenantScopedRequest, res: Response) => {
  const { workflow, optedOutIds } = await withTenantContext(req.tenantContext!, async (tx) => {
    const workflow = await findWorkflow(tx, req.params.workflowId);
    if (
      req.user!.role === "CONSULTANT" &&
      workflow.scope === "PERSONAL" &&
      workflow.createdByUserId !== req.user!.id
    ) {
      throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    }
    const optedOutIds = await getOwnOptedOutWorkflowIds(tx, req);
    return { workflow, optedOutIds };
  });
  res.json({
    data: { ...withOwnership(workflow, req.user!.id), optedOut: optedOutIds.has(workflow.id) },
  });
});

const emptyGraph = { nodes: [], edges: [] };

const createWorkflowSchema = z
  .object({
    name: z.string().min(1).max(200),
    triggerType: z.enum(["SCHEDULE", "EVENT", "MANUAL"]),
    scope: z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).default("PERSONAL"),
  })
  .strict();

// POST /tenants/:tenantId/workflows — each role is locked to exactly one
// scope, regardless of what's in the request body: CONSULTANT always creates
// PERSONAL (for themselves — consultantId is always their own profile);
// TENANT_ADMIN always creates TENANT (organization-scoped, common to every
// consultant); SUPER_ADMIN always creates COMMUNITY (usable across every
// tenant). A TENANT_ADMIN/SUPER_ADMIN carries no ConsultantProfile, so
// consultantId stays null for those. Starts as an empty DRAFT graph; a
// CONSULTANT fills it in via PATCH (workflows.router.ts's
// requireWorkflowManagePermission — CONSULTANT-only from here on, even for a
// TENANT/COMMUNITY workflow this caller didn't create).
workflowsRouter.post(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createWorkflowSchema.parse(req.body);
    const isTenantAdmin = req.user!.role === "TENANT_ADMIN";
    const isSuperAdmin = req.user!.role === "SUPER_ADMIN";

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      let consultantId: string | null = null;
      if (!isTenantAdmin && !isSuperAdmin) {
        consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (!consultantId) {
          throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
        }
      }
      return tx.workflow.create({
        data: {
          tenantId: req.params.tenantId,
          consultantId,
          createdByUserId: req.user!.id,
          name: body.name,
          triggerType: body.triggerType,
          scope: isTenantAdmin ? "TENANT" : isSuperAdmin ? "COMMUNITY" : "PERSONAL",
          graph: emptyGraph as Prisma.InputJsonValue,
        },
      });
    });

    res.status(201).json({ data: { ...withOwnership(created, req.user!.id), optedOut: false } });
  }
);

const triggerWorkflowSchema = z
  .object({
    context: z.record(z.unknown()).optional(),
  })
  .strict();

// POST /tenants/:tenantId/workflows/:workflowId/run — CONSULTANT only, now
// that running a workflow (of any scope) belongs to CONSULTANTs rather than
// whichever role created it. The owning CONSULTANT for PERSONAL; any
// CONSULTANT who hasn't opted (paused) themselves out of it for TENANT/
// COMMUNITY — shared workflows are meant to be picked from the list and run
// by whoever wants them. Manually starts a run on demand, same
// create+enqueue shape as the SCHEDULE/EVENT trigger paths
// (cron/workflow-triggers.ts, lib/workflow-events.ts), except the caller
// supplies the run's initial context directly instead of it being assembled
// from a schedule/event. Any PUBLISHED workflow can be run this way
// regardless of its configured triggerType — a workflow built for
// SCHEDULE/EVENT can still be run once by hand.
workflowsRouter.post(
  "/:workflowId/run",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = triggerWorkflowSchema.parse(req.body);

    const run = await withTenantContext(req.tenantContext!, async (tx) => {
      const workflow = await findWorkflow(tx, req.params.workflowId);

      // Reused below both for the opt-out check and to stamp the run's
      // context with the caller's real identity — there's no consultantId
      // column on workflow_runs, so context.consultant.id (the same shape
      // enqueueEventTriggers/sweepScheduledWorkflows use) is what scopes a
      // run to a specific consultant.
      const callerConsultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!callerConsultantId) {
        throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
      }

      if (workflow.scope === "PERSONAL") {
        requireOwnWorkflow(req, workflow);
      } else {
        const optedOut = await tx.workflowOptOut.findUnique({
          where: {
            workflowId_consultantId: {
              workflowId: workflow.id,
              consultantId: callerConsultantId,
            },
          },
        });
        if (optedOut) {
          throw new AppError(422, "You've opted out of this workflow", "WORKFLOW_OPTED_OUT");
        }
      }

      if (workflow.status !== "PUBLISHED") {
        throw new AppError(422, "Only a PUBLISHED workflow can be run", "WORKFLOW_NOT_PUBLISHED");
      }

      // Caller-supplied context first, then the real consultant/organization
      // identity layered on top so it can't be spoofed via the request body.
      const context = {
        ...(body.context ?? {}),
        ...(await buildConsultantContext(tx, callerConsultantId)),
      };

      return tx.workflowRun.create({
        data: {
          tenantId: req.params.tenantId,
          workflowId: workflow.id,
          status: "RUNNING",
          context: context as Prisma.InputJsonValue,
        },
      });
    });

    await enqueue(WORKFLOW_ADVANCE_QUEUE, { runId: run.id });

    res.status(201).json({ data: run });
  }
);

// Publish/pause/archive maps onto workflows.status (Sprint 5.5.3 item 3).
// ARCHIVED is terminal, matching the platform's no-hard-delete convention
// for status-bearing records (api-patterns.md §"Soft delete").
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["PAUSED", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

const patchWorkflowSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    graph: workflowGraphSchema.optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/workflows/:workflowId
//
// Permissions are split by what the caller is changing:
//   • name / graph, publishing (DRAFT -> PUBLISHED), and archiving —
//     requireWorkflowManagePermission: owner-only for PERSONAL, any
//     CONSULTANT (never the creating TENANT_ADMIN/SUPER_ADMIN) for
//     TENANT/COMMUNITY. These do flip real workflows.status (publish/
//     archive) since there's only one shared graph/status to change.
//   • pause / resume (PUBLISHED <-> PAUSED) — requirePauseResumePermission,
//     same split. For PERSONAL, the owner's request flips real
//     workflows.status, since they're the only one it runs for. For
//     TENANT/COMMUNITY, a CONSULTANT's request never touches
//     workflows.status at all — it upserts/removes their own WorkflowOptOut
//     row instead (see isSharedScope below), the same row the dedicated
//     opt-out endpoints manage, unique per (workflowId, consultantId), so
//     one consultant pausing/resuming never affects another's.
const PAUSE_RESUME_TRANSITIONS = new Set(["PUBLISHED->PAUSED", "PAUSED->PUBLISHED"]);

workflowsRouter.patch(
  "/:workflowId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchWorkflowSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const workflow = await findWorkflow(tx, req.params.workflowId);

      const isContentChange = body.name !== undefined || body.graph !== undefined;
      const isPauseResume =
        !isContentChange &&
        body.status !== undefined &&
        PAUSE_RESUME_TRANSITIONS.has(`${workflow.status}->${body.status}`);

      if (isPauseResume) {
        requirePauseResumePermission(req, workflow);

        const isSharedScope = workflow.scope !== "PERSONAL";
        if (isSharedScope) {
          const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
          if (!consultantId) {
            throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
          }
          if (body.status === "PAUSED") {
            await tx.workflowOptOut.upsert({
              where: { workflowId_consultantId: { workflowId: workflow.id, consultantId } },
              create: { tenantId: req.params.tenantId, workflowId: workflow.id, consultantId },
              update: {},
            });
          } else {
            await tx.workflowOptOut.deleteMany({
              where: { workflowId: workflow.id, consultantId },
            });
          }
          return workflow;
        }
      } else {
        // Content edits, publishing, and archiving.
        requireWorkflowManagePermission(req, workflow);
      }

      if (body.status && body.status !== workflow.status) {
        if (!ALLOWED_TRANSITIONS[workflow.status].includes(body.status)) {
          throw new AppError(
            422,
            `Cannot transition from ${workflow.status} to ${body.status}`,
            "INVALID_STATUS_TRANSITION"
          );
        }
      }

      return tx.workflow.update({
        where: { id: workflow.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.graph !== undefined && { graph: body.graph as Prisma.InputJsonValue }),
          ...(body.status !== undefined && { status: body.status }),
        },
      });
    });

    res.json({ data: updated });
  }
);

// DELETE /tenants/:tenantId/workflows/:workflowId — SUPER_ADMIN may delete
// any workflow, any scope. TENANT_ADMIN may only delete a CONSULTANT's own
// PERSONAL workflow — never a TENANT/COMMUNITY one (including their own
// TENANT-scoped creation) — and only within their own tenant, which
// requireTenantMatch/withTenantContext's RLS already confines them to; there
// is no cross-tenant reach here. Nobody else (not even a PERSONAL workflow's
// own creator) can delete a workflow at all. Soft-deletes via deletedAt.
workflowsRouter.delete(
  "/:workflowId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const workflow = await findWorkflow(tx, req.params.workflowId);
      if (req.user!.role === "TENANT_ADMIN" && workflow.scope !== "PERSONAL") {
        throw new AppError(
          403,
          "A TENANT_ADMIN can only delete a consultant's PERSONAL workflow",
          "TENANT_ADMIN_DELETE_PERSONAL_ONLY"
        );
      }
      await tx.workflow.update({
        where: { id: workflow.id },
        data: { deletedAt: new Date() },
      });
    });
    res.status(204).send();
  }
);

// POST /tenants/:tenantId/workflows/:workflowId/opt-out — CONSULTANT only.
// Stops a TENANT/COMMUNITY scoped workflow from firing for the caller's own
// cases (checked by workflow-events.ts's enqueueEventTriggers) without
// touching workflows.status, so it keeps running for every other
// consultant. A PERSONAL workflow has no one else to keep it running for, so
// opting out isn't meaningful there — pause it instead.
workflowsRouter.post(
  "/:workflowId/opt-out",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const workflow = await findWorkflow(tx, req.params.workflowId);
      if (workflow.scope === "PERSONAL") {
        throw new AppError(422, "Personal workflows can't be opted out of", "WORKFLOW_NOT_SHARED");
      }
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!consultantId) {
        throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
      }
      await tx.workflowOptOut.upsert({
        where: { workflowId_consultantId: { workflowId: workflow.id, consultantId } },
        create: { tenantId: req.params.tenantId, workflowId: workflow.id, consultantId },
        update: {},
      });
    });
    res.status(204).send();
  }
);

// DELETE /tenants/:tenantId/workflows/:workflowId/opt-out — re-enables a
// previously opted-out TENANT/COMMUNITY workflow for the caller.
workflowsRouter.delete(
  "/:workflowId/opt-out",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!consultantId) {
        throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
      }
      await tx.workflowOptOut.deleteMany({
        where: { workflowId: req.params.workflowId, consultantId },
      });
    });
    res.status(204).send();
  }
);
