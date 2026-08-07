import type { Prisma, UserRole } from "@ayushman/db";
interface AuditLogInput {
    tenantId: string;
    actorUserId: string;
    actorRole: UserRole;
    isCrossTenantAccess: boolean;
    action: string;
    entityType: string;
    entityId?: string;
    reason?: string;
}
export declare function writeAuditLog(tx: Prisma.TransactionClient, input: AuditLogInput): Promise<void>;
export {};
//# sourceMappingURL=audit.service.d.ts.map