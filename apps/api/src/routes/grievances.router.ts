import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";

// A TENANT_ADMIN's own grievance escalations straight to the Super Admin —
// the `grievances` model's submitterUserId/submitterRole columns already
// support this (see the model's own comment in schema.prisma); this router
// is the API catching up to that, for the TENANT_ADMIN path only. Mounted
// at the bare /api/tenants/:tenantId prefix, same as notifications.router.ts.
export const grievancesRouter: Router = Router({ mergeParams: true });
grievancesRouter.use(requireTenantMatch);
grievancesRouter.use(requireRole("TENANT_ADMIN"));

const createGrievanceSchema = z
  .object({
    subjectType: z.enum(["BILLING", "PLATFORM", "OTHER"]),
    category: z.enum(["BILLING_DISPUTE", "DATA_PRIVACY", "OTHER"]),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    description: z.string().min(1),
  })
  .strict();

// POST /tenants/:tenantId/grievances
grievancesRouter.post("/grievances", async (req: TenantScopedRequest, res: Response) => {
  const body = createGrievanceSchema.parse(req.body);

  const grievance = await withTenantContext(req.tenantContext!, (tx) =>
    tx.grievance.create({
      data: {
        tenantId: req.tenantContext!.tenantId,
        submitterUserId: req.user!.id,
        submitterRole: "TENANT_ADMIN",
        subjectType: body.subjectType,
        category: body.category,
        severity: body.severity,
        description: body.description,
      },
    })
  );

  res.status(201).json({ data: grievance });
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /tenants/:tenantId/grievances/mine — hard-filtered to the caller's own
// submissions, same rule as the CLIENT-facing /grievances/mine route (§18).
grievancesRouter.get("/grievances/mine", async (req: TenantScopedRequest, res: Response) => {
  const query = listQuerySchema.parse(req.query);

  const grievances = await withTenantContext(req.tenantContext!, (tx) =>
    tx.grievance.findMany({
      where: { submitterUserId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    })
  );

  res.json({ data: grievances });
});
