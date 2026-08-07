import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";

// data_api_v4.md §18 — GET /platform/grievances. This is the one resource
// where a Super Admin's cross-tenant read is the normal access pattern, not
// an escalation — no `reason` required, unlike the platform tenants routes.
export const platformGrievancesRouter: Router = Router();
platformGrievancesRouter.use(requireRole("SUPER_ADMIN"));

const listGrievancesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  category: z
    .enum(["SERVICE_QUALITY", "MISCONDUCT", "BILLING_DISPUTE", "DATA_PRIVACY", "OTHER"])
    .optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

platformGrievancesRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const query = listGrievancesQuerySchema.parse(req.query);

  const grievances = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
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

      const tenantIds = [
        ...new Set(found.map((g) => g.tenantId).filter((id): id is string => id !== null)),
      ];
      const tenants = tenantIds.length
        ? await tx.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, displayName: true },
          })
        : [];
      const tenantById = new Map(tenants.map((t) => [t.id, t]));

      const clientIds = [
        ...new Set(found.map((g) => g.clientId).filter((id): id is string => id !== null)),
      ];
      const clients = clientIds.length
        ? await tx.clientProfile.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, fullName: true },
          })
        : [];
      const clientById = new Map(clients.map((c) => [c.id, c]));

      const consultantIds = [
        ...new Set(found.map((g) => g.subjectConsultantId).filter((id): id is string => !!id)),
      ];
      const consultants = consultantIds.length
        ? await tx.consultantProfile.findMany({
            where: { id: { in: consultantIds } },
            select: { id: true, fullName: true },
          })
        : [];
      const consultantById = new Map(consultants.map((c) => [c.id, c]));

      return found.map((g) => ({
        ...g,
        tenant: (g.tenantId ? tenantById.get(g.tenantId) : undefined) ?? null,
        client: (g.clientId ? clientById.get(g.clientId) : undefined) ?? null,
        subjectConsultant: g.subjectConsultantId
          ? (consultantById.get(g.subjectConsultantId) ?? null)
          : null,
      }));
    }
  );

  res.json({ data: grievances });
});
