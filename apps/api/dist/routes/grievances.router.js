"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grievancesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
// A TENANT_ADMIN's own grievance escalations straight to the Super Admin —
// the `grievances` model's submitterUserId/submitterRole columns already
// support this (see the model's own comment in schema.prisma); this router
// is the API catching up to that, for the TENANT_ADMIN path only. Mounted
// at the bare /api/tenants/:tenantId prefix, same as notifications.router.ts.
exports.grievancesRouter = (0, express_1.Router)({ mergeParams: true });
exports.grievancesRouter.use(require_tenant_match_1.requireTenantMatch);
exports.grievancesRouter.use((0, require_role_1.requireRole)("TENANT_ADMIN"));
const createGrievanceSchema = zod_1.z
    .object({
    subjectType: zod_1.z.enum(["BILLING", "PLATFORM", "OTHER"]),
    category: zod_1.z.enum(["BILLING_DISPUTE", "DATA_PRIVACY", "OTHER"]),
    severity: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    description: zod_1.z.string().min(1),
})
    .strict();
// POST /tenants/:tenantId/grievances
exports.grievancesRouter.post("/grievances", async (req, res) => {
    const body = createGrievanceSchema.parse(req.body);
    const grievance = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.grievance.create({
        data: {
            tenantId: req.tenantContext.tenantId,
            submitterUserId: req.user.id,
            submitterRole: "TENANT_ADMIN",
            subjectType: body.subjectType,
            category: body.category,
            severity: body.severity,
            description: body.description,
        },
    }));
    res.status(201).json({ data: grievance });
});
const listQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
// GET /tenants/:tenantId/grievances/mine — hard-filtered to the caller's own
// submissions, same rule as the CLIENT-facing /grievances/mine route (§18).
exports.grievancesRouter.get("/grievances/mine", async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const grievances = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.grievance.findMany({
        where: { submitterUserId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: query.limit,
    }));
    res.json({ data: grievances });
});
//# sourceMappingURL=grievances.router.js.map