import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { withTenantContext } from "@ayushman/db/rls-context";

export const meRouter: Router = Router();

// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
meRouter.get("/me", async (req: AuthenticatedRequest, res: Response) => {
  // tenant_read_own (supabase/policies/02-tenants.sql) lets a session read
  // its own tenant row by app.tenant_id — exactly the lookup GET /auth/me
  // needs, no super-admin bypass required.
  const tenantId = req.user!.tenantId;
  const tenant = tenantId
    ? await withTenantContext({ tenantId, isSuperAdmin: false, userId: req.user!.id }, (tx) =>
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { slug: true, status: true, displayName: true },
        })
      )
    : null;

  res.json({
    data: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      tenantId: req.user!.tenantId,
      tenant,
    },
  });
});
