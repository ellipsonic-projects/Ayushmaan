import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { AppError } from "../middleware/errorHandler";

// Mounted at /api/platform/workflows — Super Admin authoring, cross-tenant
// by design (same rationale as platform-grievances.router.ts's GET
// /platform/grievances, and workflow-templates.router.ts's
// platformWorkflowTemplateModerationRouter): a COMMUNITY workflow belongs to
// no single tenant (tenant_id null — see the Workflow model), so this never
// nests under a :tenantId the way workflows.router.ts does.
//
// Once created here, everything about actually building/running the
// workflow — editing its graph, publishing, pausing, resuming, running —
// belongs to CONSULTANTs, reached through their own tenant-scoped router
// (workflows.router.ts's PATCH/POST .../run); its requireWorkflowManagePermission
// already rejects a SUPER_ADMIN there and works by workflow id alone, so it
// needs no changes to reach a tenant_id-null row once 13-workflows.sql's
// scope-gated RLS allows it through. This router only ever needs
// list/create/read/delete — the creating Super Admin's job ends at
// creation, same as the existing tenant-scoped POST's SUPER_ADMIN branch.
export const platformWorkflowsRouter: Router = Router();
platformWorkflowsRouter.use(requireRole("SUPER_ADMIN"));

const emptyGraph = { nodes: [], edges: [] };

async function findCommunityWorkflow(tx: Prisma.TransactionClient, workflowId: string) {
  const workflow = await tx.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.deletedAt || workflow.scope !== "COMMUNITY") {
    throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
  }
  return workflow;
}

// GET /api/platform/workflows — every COMMUNITY workflow, any tenant (or
// tenant_id null), same shape as workflows.router.ts's tenant-scoped list.
platformWorkflowsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const workflows = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      tx.workflow.findMany({
        where: { scope: "COMMUNITY", deletedAt: null },
        include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
      })
  );

  res.json({
    data: workflows.map((w) => ({
      ...w,
      isOwn: w.createdByUserId === req.user!.id,
      optedOut: false,
    })),
  });
});

// GET /api/platform/workflows/:workflowId
platformWorkflowsRouter.get("/:workflowId", async (req: AuthenticatedRequest, res: Response) => {
  const workflow = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) => findCommunityWorkflow(tx, req.params.workflowId)
  );
  res.json({
    data: { ...workflow, isOwn: workflow.createdByUserId === req.user!.id, optedOut: false },
  });
});

// Not .strict() — WorkflowsBoard (components/tenant/shared/workflows/workflows-board.tsx)
// sends the same { name, triggerType, scope } payload to every viewerRole's
// create call; scope is ignored here since it's always forced to COMMUNITY.
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.enum(["SCHEDULE", "EVENT", "MANUAL"]),
});

// POST /api/platform/workflows — always scope=COMMUNITY, tenant_id/
// consultant_id null, mirroring workflows.router.ts's tenant-scoped POST
// SUPER_ADMIN branch minus the :tenantId. Starts as an empty DRAFT graph; a
// CONSULTANT fills it in from their own tenant's Workflows page.
platformWorkflowsRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const body = createWorkflowSchema.parse(req.body);

  const created = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      tx.workflow.create({
        data: {
          tenantId: null,
          consultantId: null,
          createdByUserId: req.user!.id,
          name: body.name,
          triggerType: body.triggerType,
          scope: "COMMUNITY",
          graph: emptyGraph as Prisma.InputJsonValue,
        },
      })
  );

  res.status(201).json({ data: { ...created, isOwn: true, optedOut: false } });
});

// DELETE /api/platform/workflows/:workflowId — soft-delete, mirrors
// workflows.router.ts's DELETE (a Super Admin may delete any workflow, any
// scope) restricted here to the COMMUNITY rows this router creates.
platformWorkflowsRouter.delete("/:workflowId", async (req: AuthenticatedRequest, res: Response) => {
  await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      await findCommunityWorkflow(tx, req.params.workflowId);
      await tx.workflow.update({
        where: { id: req.params.workflowId },
        data: { deletedAt: new Date() },
      });
    }
  );
  res.status(204).send();
});
