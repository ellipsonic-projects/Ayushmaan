"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRunsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const pgmq_1 = require("../queue/pgmq");
// Mounted at /api/tenants/:tenantId/workflows/:workflowId/runs — Sprint
// 5.5.5 item 1: run history + manual retry. Standard tenant-isolation RLS,
// same visibility as workflows.router.ts (every CONSULTANT/TENANT_ADMIN in
// the tenant can see every workflow's runs; only the consultant a given run
// actually belongs to — via context.consultant.id, see the retry handler
// below — may retry it).
exports.workflowRunsRouter = (0, express_1.Router)({ mergeParams: true });
exports.workflowRunsRouter.use(require_tenant_match_1.requireTenantMatch);
exports.workflowRunsRouter.use((0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));
async function findWorkflow(tx, tenantId, workflowId) {
    const workflow = await tx.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow || workflow.tenantId !== tenantId || workflow.deletedAt) {
        throw new errorHandler_1.AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    }
    return workflow;
}
const listRunsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["RUNNING", "WAITING", "WAITING_ON_FORM", "COMPLETED", "FAILED"]).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
// GET /tenants/:tenantId/workflows/:workflowId/runs
exports.workflowRunsRouter.get("/", async (req, res) => {
    const query = listRunsQuerySchema.parse(req.query);
    const runs = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
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
exports.workflowRunsRouter.get("/:runId", async (req, res) => {
    const run = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findWorkflow(tx, req.params.tenantId, req.params.workflowId);
        const found = await tx.workflowRun.findUnique({ where: { id: req.params.runId } });
        if (!found || found.workflowId !== req.params.workflowId || found.deletedAt) {
            throw new errorHandler_1.AppError(404, "Run not found", "WORKFLOW_RUN_NOT_FOUND");
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
exports.workflowRunsRouter.post("/:runId/retry", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findWorkflow(tx, req.params.tenantId, req.params.workflowId);
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!consultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_A_CONSULTANT");
        }
        const run = await tx.workflowRun.findUnique({ where: { id: req.params.runId } });
        if (!run || run.workflowId !== req.params.workflowId || run.deletedAt) {
            throw new errorHandler_1.AppError(404, "Run not found", "WORKFLOW_RUN_NOT_FOUND");
        }
        const runConsultantId = run.context?.consultant
            ?.id;
        if (runConsultantId !== consultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_RUN");
        }
        if (run.status !== "FAILED") {
            throw new errorHandler_1.AppError(422, "Only a FAILED run can be retried", "RUN_NOT_FAILED");
        }
        return tx.workflowRun.update({
            where: { id: run.id },
            data: { status: "RUNNING", failureReason: null },
        });
    });
    await (0, pgmq_1.enqueue)(pgmq_1.WORKFLOW_ADVANCE_QUEUE, { runId: updated.id });
    res.json({ data: updated });
});
//# sourceMappingURL=workflow-runs.router.js.map