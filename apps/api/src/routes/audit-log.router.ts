import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";

// api-patterns.md §22 — GET /tenants/:tenantId/audit-log. Own-tenant
// escalation history only — filtering by tenantId (the tenant whose data was
// accessed) already excludes any row where a Super Admin escalated into a
// *different* tenant, so no extra isCrossTenantAccess check is needed here.
export const tenantAuditLogRouter: Router = Router({ mergeParams: true });
tenantAuditLogRouter.use(requireTenantMatch);
tenantAuditLogRouter.use(requireRole("TENANT_ADMIN", "SUPER_ADMIN"));

const listTenantAuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

tenantAuditLogRouter.get("/", async (req: TenantScopedRequest, res: Response) => {
  const query = listTenantAuditLogQuerySchema.parse(req.query);

  const entries = await withTenantContext(req.tenantContext!, async (tx) => {
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
      ...new Set(
        found.filter((e) => e.entityType === "Case" && e.entityId).map((e) => e.entityId!)
      ),
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
export const platformAuditLogRouter: Router = Router();
platformAuditLogRouter.use(requireRole("SUPER_ADMIN"));

const listAuditLogQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  isCrossTenantAccess: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

platformAuditLogRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const query = listAuditLogQuerySchema.parse(req.query);

  const entries = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
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
    }
  );

  res.json({ data: entries });
});
