import { Router, Response } from "express";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";

// data_api_v4.md §4 — GET /platform/dashboard. Global scope, no tenant-context
// middleware applies; cross-tenant KPI aggregation is a Super Admin-only read.
export const platformDashboardRouter: Router = Router();
platformDashboardRouter.use(requireRole("SUPER_ADMIN"));

platformDashboardRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stats = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      const [activeTenants, openGrievances, criticalGrievances, totalUsers, newTenants] =
        await Promise.all([
          tx.tenant.count({ where: { status: "ACTIVE" } }),
          tx.grievance.count({ where: { status: "OPEN" } }),
          tx.grievance.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
          tx.user.count(),
          tx.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        ]);
      return { activeTenants, openGrievances, criticalGrievances, totalUsers, newTenants };
    }
  );

  res.json({ data: stats });
});
