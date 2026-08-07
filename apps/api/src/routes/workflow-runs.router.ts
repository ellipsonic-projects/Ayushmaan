import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnConsultantProfileId } from "../lib/callerProfile";
import { enqueue, WORKFLOW_ADVANCE_QUEUE } from "../queue/pgmq";

// Mounted at /api/tenants/:tenantId/workflows/:workflowId/runs — Sprint
// 5.5.5 item 1: run history + manual retry. Standard tenant-isolation RLS,
// same visibility as workflows.router.ts (every CONSULTANT/TENANT_ADMIN in
// the tenant can see every workflow's runs; only the consultant a given run
// actually belongs to — via context.consultant.id, see the retry handler
// below — may retry it).
export const workflowRunsRouter: Router = Router({ mergeParams: true });
workflowRunsRouter.use(requireTenantMatch);
workflowRunsRouter.use(requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));

async function findWorkflow(tx: Prisma.TransactionClient, tenantId: string, workflowId: string) {
  const workflow = await tx.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.tenantId !== tenantId || workflow.deletedAt) {
    throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
  }
  return workflow;
}

const listRunsQuerySchema = z.object({
  status: z.enum(["RUNNING", "WAITING", "WAITING_ON_FORM", "COMPLETED", "FAILED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /tenants/:tenantId/workflows/:workflowId/runs
workflowRunsRouter.get("/", async (req: TenantScopedRequest, res: Response) => {
  const query = listRunsQuerySchema.parse(req.query);

  const runs = await withTenantContext(req.tenantContext!, async (tx) => {
    await findWorkflow(tx, req.params.tenantId, req.params.workflowId);
    return tx.workflowRun.findMany({
      where: {
        workflowId: req.params.workflowId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
  });

  res.json({ data: runs });
});

// GET /tenants/:tenantId/workflows/:workflowId/runs/:runId — full record
// including context, for inspecting exactly what a run saw/did.
workflowRunsRouter.get("/:runId", async (req: TenantScopedRequest, res: Response) => {
  const run = await withTenantContext(req.tenantContext!, async (tx) => {
    await findWorkflow(tx, req.params.tenantId, req.params.workflowId);
    const found = await tx.workflowRun.findUnique({ where: { id: req.params.runId } });
    if (!found || found.workflowId !== req.params.workflowId || found.deletedAt) {
      throw new AppError(404, "Run not found", "WORKFLOW_RUN_NOT_FOUND");
    }
    return found;
  });

  res.json({ data: run });
});

// POST /tenants/:tenantId/workflows/:workflowId/runs/:runId/retry — the
// CONSULTANT that run belongs to only. A shared TENANT/COMMUNITY workflow
// now produces one run per consultant that ran it (workflows.router.ts's
// /run endpoint), each stamped with that consultant's identity at
// context.consultant.id — no consultantId column on workflow_runs, so
// ownership here is checked against that same JSON path rather than the
// workflow's owner, otherwise a non-owner consultant could never retry their
// own failed run. A FAILED run's current_node_id already points at the node
// that actually failed (workflow-engine.service.ts commits progress one node
// at a time), so retrying is just: flip back to RUNNING, clear the failure
// reason, and re-enqueue — no need to restart from the trigger.
workflowRunsRouter.post(
  "/:runId/retry",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      await findWorkflow(tx, req.params.tenantId, req.params.workflowId);

      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!consultantId) {
        throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
      }

      const run = await tx.workflowRun.findUnique({ where: { id: req.params.runId } });
      if (!run || run.workflowId !== req.params.workflowId || run.deletedAt) {
        throw new AppError(404, "Run not found", "WORKFLOW_RUN_NOT_FOUND");
      }
      const runConsultantId = (run.context as { consultant?: { id?: string } } | null)?.consultant
        ?.id;
      if (runConsultantId !== consultantId) {
        throw new AppError(403, "Forbidden", "NOT_OWN_RUN");
      }
      if (run.status !== "FAILED") {
        throw new AppError(422, "Only a FAILED run can be retried", "RUN_NOT_FAILED");
      }

      return tx.workflowRun.update({
        where: { id: run.id },
        data: { status: "RUNNING", failureReason: null },
      });
    });

    await enqueue(WORKFLOW_ADVANCE_QUEUE, { runId: updated.id });

    res.json({ data: updated });
  }
);
