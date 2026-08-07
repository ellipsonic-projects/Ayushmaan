"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseAuditedForSuperAdmin = getCaseAuditedForSuperAdmin;
exports.listCasesAuditedForSuperAdmin = listCasesAuditedForSuperAdmin;
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
// SUPER_ADMIN listing all cases for an arbitrary tenant is cross-tenant by
// definition, same rationale as getCaseAuditedForSuperAdmin above — logged
// once per list call rather than once per row.
async function listCasesAuditedForSuperAdmin(tenantId, actorUserId) {
    return (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: actorUserId }, async (tx) => {
        const cases = await tx.case.findMany({
            where: { tenantId, deletedAt: null },
            select: {
                id: true,
                matterKey: true,
                category: true,
                tags: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                client: { select: { fullName: true } },
                consultant: { select: { fullName: true } },
                _count: {
                    select: { interactions: true, commitments: true, tasks: true, documents: true },
                },
            },
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId,
            actorUserId,
            actorRole: "SUPER_ADMIN",
            isCrossTenantAccess: true,
            action: "LIST_CASES",
            entityType: "case",
        });
        return cases;
    });
}
//# sourceMappingURL=cases.service.js.map