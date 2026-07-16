"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformDashboardRouter = void 0;
const express_1 = require("express");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
// data_api_v4.md §4 — GET /platform/dashboard. Global scope, no tenant-context
// middleware applies; cross-tenant KPI aggregation is a Super Admin-only read.
exports.platformDashboardRouter = (0, express_1.Router)();
exports.platformDashboardRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
exports.platformDashboardRouter.get("/", async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stats = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const [activeTenants, openGrievances, criticalGrievances, totalUsers, newTenants] = await Promise.all([
            tx.tenant.count({ where: { status: "ACTIVE" } }),
            tx.grievance.count({ where: { status: "OPEN" } }),
            tx.grievance.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
            tx.user.count(),
            tx.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        ]);
        return { activeTenants, openGrievances, criticalGrievances, totalUsers, newTenants };
    });
    res.json({ data: stats });
});
//# sourceMappingURL=platform-dashboard.router.js.map