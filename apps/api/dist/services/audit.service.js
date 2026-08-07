"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
// Every Super Admin cross-tenant read/write and every Tenant Admin escalated
// case view writes here inside the same transaction as the access itself —
// never a separate, skippable step (data_api_v4.md §1.9, PRD §1.2 "unrestricted
// != invisible"). Takes the request's own transaction client so the audit row
// and the access it's logging commit or roll back together.
async function writeAuditLog(tx, input) {
    await tx.auditLog.create({
        data: {
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            actorRole: input.actorRole,
            isCrossTenantAccess: input.isCrossTenantAccess,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            reason: input.reason,
        },
    });
}
//# sourceMappingURL=audit.service.js.map