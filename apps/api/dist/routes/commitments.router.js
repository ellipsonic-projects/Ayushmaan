"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitmentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
// Mounted at /api/tenants/:tenantId/commitments.
exports.commitmentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.commitmentsRouter.use(require_tenant_match_1.requireTenantMatch);
const patchCommitmentSchema = zod_1.z
    .object({
    status: zod_1.z.enum(["ACTIVE", "COMPLETED", "DISCONTINUED"]),
})
    .strict();
// PATCH /tenants/:tenantId/commitments/:commitmentId — CONSULTANT (own case).
// Status transitions only (api-patterns.md §14).
exports.commitmentsRouter.patch("/:commitmentId", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = patchCommitmentSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const commitment = await tx.commitment.findUnique({
            where: { id: req.params.commitmentId },
        });
        if (!commitment || commitment.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Commitment not found", "COMMITMENT_NOT_FOUND");
        }
        await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, commitment.caseId, req.user.id);
        const result = await tx.commitment.update({
            where: { id: commitment.id },
            data: { status: body.status },
        });
        if (body.status !== commitment.status &&
            (body.status === "COMPLETED" || body.status === "DISCONTINUED")) {
            const eventName = body.status === "COMPLETED" ? "COMMITMENT_COMPLETED" : "COMMITMENT_DISCONTINUED";
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, eventName, {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, commitment.caseId)),
                commitment: { id: result.id, title: result.title },
            });
        }
        return result;
    });
    res.json({ data: updated });
});
//# sourceMappingURL=commitments.router.js.map