"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseAuditedForSuperAdmin = getCaseAuditedForSuperAdmin;
const rls_context_1 = require("@ayushman/db/rls-context");
const errorHandler_1 = require("../middleware/errorHandler");
const audit_service_1 = require("./audit.service");
// A Super Admin reading a single case is cross-tenant by definition (they
// have no tenantId of their own), so every read here is logged — same
// transaction as the read itself, per audit.service.ts's own contract
// ("never a separate, skippable step"). Shared by cases.router.ts's
// GET /:caseId and tests/integration/rls-policies.test.ts so both exercise
// identical semantics.
async function getCaseAuditedForSuperAdmin(caseId, actorUserId) {
    return (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: actorUserId }, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: caseId } });
        if (!target) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: target.tenantId,
            actorUserId,
            actorRole: "SUPER_ADMIN",
            isCrossTenantAccess: true,
            action: "READ",
            entityType: "case",
            entityId: target.id,
        });
        return target;
    });
}
//# sourceMappingURL=cases.service.js.map