"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformGrievancesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
// data_api_v4.md §18 — GET /platform/grievances. This is the one resource
// where a Super Admin's cross-tenant read is the normal access pattern, not
// an escalation — no `reason` required, unlike the platform tenants routes.
exports.platformGrievancesRouter = (0, express_1.Router)();
exports.platformGrievancesRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
const listGrievancesQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid().optional(),
    category: zod_1.z
        .enum(["SERVICE_QUALITY", "MISCONDUCT", "BILLING_DISPUTE", "DATA_PRIVACY", "OTHER"])
        .optional(),
    severity: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    status: zod_1.z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.platformGrievancesRouter.get("/", async (req, res) => {
    const query = listGrievancesQuerySchema.parse(req.query);
    const grievances = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const found = await tx.grievance.findMany({
            where: {
                tenantId: query.tenantId,
                category: query.category,
                severity: query.severity,
                status: query.status,
            },
            orderBy: { createdAt: "desc" },
            take: query.limit,
        });
        const tenantIds = [...new Set(found.map((g) => g.tenantId))];
        const tenants = tenantIds.length
            ? await tx.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, displayName: true },
            })
            : [];
        const tenantById = new Map(tenants.map((t) => [t.id, t]));
        return found.map((g) => ({ ...g, tenant: tenantById.get(g.tenantId) ?? null }));
    });
    res.json({ data: grievances });
});
//# sourceMappingURL=platform-grievances.router.js.map