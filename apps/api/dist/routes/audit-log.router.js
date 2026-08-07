"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformAuditLogRouter = exports.tenantAuditLogRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
// api-patterns.md §22 — GET /tenants/:tenantId/audit-log. Own-tenant
// escalation history only — filtering by tenantId (the tenant whose data was
// accessed) already excludes any row where a Super Admin escalated into a
// *different* tenant, so no extra isCrossTenantAccess check is needed here.
exports.tenantAuditLogRouter = (0, express_1.Router)({ mergeParams: true });
exports.tenantAuditLogRouter.use(require_tenant_match_1.requireTenantMatch);
exports.tenantAuditLogRouter.use((0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"));
const listTenantAuditLogQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
exports.tenantAuditLogRouter.get("/", async (req, res) => {
    const query = listTenantAuditLogQuerySchema.parse(req.query);
    const entries = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await tx.auditLog.findMany({
            where: { tenantId: req.params.tenantId },
            orderBy: { createdAt: "desc" },
            take: query.limit,
        });
        const actorIds = [...new Set(found.map((e) => e.actorUserId))];
        const actors = actorIds.length
            ? await tx.user.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, email: true, consultantProfile: { select: { fullName: true } } },
            })
            : [];
        const actorById = new Map(actors.map((a) => [a.id, a]));
        const caseEntityIds = [
            ...new Set(found.filter((e) => e.entityType === "Case" && e.entityId).map((e) => e.entityId)),
        ];
        const cases = caseEntityIds.length
            ? await tx.case.findMany({
                where: { id: { in: caseEntityIds } },
                select: { id: true, matterKey: true, category: true },
            })
            : [];
        const caseById = new Map(cases.map((c) => [c.id, c]));
        return found.map((e) => ({
            ...e,
            actor: actorById.get(e.actorUserId) ?? null,
            case: e.entityType === "Case" && e.entityId ? (caseById.get(e.entityId) ?? null) : null,
        }));
    });
    res.json({ data: entries });
});
// api-patterns.md §22 — GET /platform/audit-log. Global, filterable
// audit trail; `audit_logs` itself has no write route exposed to user input.
exports.platformAuditLogRouter = (0, express_1.Router)();
exports.platformAuditLogRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
const listAuditLogQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid().optional(),
    actorUserId: zod_1.z.string().uuid().optional(),
    isCrossTenantAccess: zod_1.z.coerce.boolean().optional(),
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
exports.platformAuditLogRouter.get("/", async (req, res) => {
    const query = listAuditLogQuerySchema.parse(req.query);
    const entries = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const found = await tx.auditLog.findMany({
            where: {
                tenantId: query.tenantId,
                actorUserId: query.actorUserId,
                isCrossTenantAccess: query.isCrossTenantAccess,
                createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
            },
            orderBy: { createdAt: "desc" },
            take: query.limit,
        });
        const tenantIds = [...new Set(found.map((e) => e.tenantId))];
        const tenants = tenantIds.length
            ? await tx.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, displayName: true },
            })
            : [];
        const tenantById = new Map(tenants.map((t) => [t.id, t]));
        const actorIds = [...new Set(found.map((e) => e.actorUserId))];
        const actors = actorIds.length
            ? await tx.user.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, email: true },
            })
            : [];
        const actorById = new Map(actors.map((a) => [a.id, a]));
        return found.map((e) => ({
            ...e,
            tenant: tenantById.get(e.tenantId) ?? null,
            actor: actorById.get(e.actorUserId) ?? null,
        }));
    });
    res.json({ data: entries });
});
//# sourceMappingURL=audit-log.router.js.map