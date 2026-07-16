"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseInteractionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
// Mounted at /api/tenants/:tenantId/cases/:caseId/interactions.
exports.caseInteractionsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseInteractionsRouter.use(require_tenant_match_1.requireTenantMatch);
// Loads the case and, for CONSULTANT, confirms ownership; TENANT_ADMIN and
// SUPER_ADMIN may access any case in the tenant.
async function loadCaseForInteractions(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    return found;
}
async function findInteraction(tx, tenantId, caseId, interactionId) {
    const interaction = await tx.interaction.findUnique({ where: { id: interactionId } });
    if (!interaction ||
        interaction.tenantId !== tenantId ||
        interaction.caseId !== caseId ||
        interaction.deletedAt) {
        throw new errorHandler_1.AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
    }
    return interaction;
}
const createInteractionSchema = zod_1.z
    .object({
    type: zod_1.z.enum(["SESSION_NOTE", "AD_HOC_NOTE", "CALL_LOG", "MESSAGE_LOG"]),
    notes: zod_1.z.string().min(1),
    isClientVisible: zod_1.z.boolean().default(false),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createInteractionSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        return tx.interaction.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                type: body.type,
                notes: body.notes,
                isClientVisible: body.isClientVisible,
            },
        });
    });
    res.status(201).json({ data: created });
});
// GET /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const interactions = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        return tx.interaction.findMany({
            where: { caseId: caseRow.id, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: interactions });
});
const patchInteractionSchema = zod_1.z
    .object({
    notes: zod_1.z.string().min(1).optional(),
    isClientVisible: zod_1.z.boolean().optional(),
})
    .strict();
// PATCH /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.patch("/:interactionId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = patchInteractionSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
        return tx.interaction.update({
            where: { id: req.params.interactionId },
            data: body,
        });
    });
    res.json({ data: updated });
});
// DELETE /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN. Soft-deletes via deletedAt.
exports.caseInteractionsRouter.delete("/:interactionId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
        await tx.interaction.update({
            where: { id: req.params.interactionId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
//# sourceMappingURL=case-interactions.router.js.map