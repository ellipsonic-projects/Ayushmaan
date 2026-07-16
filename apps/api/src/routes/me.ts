import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { withTenantContext } from "@ayushman/db/rls-context";
import { getOwnClientProfileId } from "../lib/callerProfile";
import { getTenant } from "../lib/tenant/getTenant";
import { AppError } from "../middleware/errorHandler";

export const meRouter: Router = Router();

// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
meRouter.get("/me", async (req: AuthenticatedRequest, res: Response) => {
  // tenant_read_own (supabase/policies/02-tenants.sql) lets a session read
  // its own tenant row by app.tenant_id — exactly the lookup GET /auth/me
  // needs, no super-admin bypass required.
  const tenantId = req.user!.tenantId;

  // CLIENT accounts are platform-level and never carry a tenant_id claim
  // (stamp-tenant-claim.sql), so their clientProfileId has to be resolved
  // outside of any tenant context — client_platform_scope RLS grants a
  // client read access to their own client_profiles row regardless of
  // app.tenant_id.
  const clientProfileId =
    req.user!.role === "CLIENT"
      ? await withTenantContext(
          { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
          (tx) => getOwnClientProfileId(tx, req.user!.id)
        )
      : null;

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
      clientProfileId,
    },
  });
});

// GET /auth/tenant-by-slug/:slug — resolves a tenant's id from its slug for
// an already-authenticated caller. Mounted alongside GET /auth/me, ahead of
// tenantContextMiddleware, since it exists precisely to discover a tenantId
// before one is known — needed by platform-level CLIENT accounts (no
// tenant_id JWT claim) to address a tenant-scoped route from a page's URL
// slug (apps/web's clients.server.ts).
meRouter.get("/tenant-by-slug/:slug", async (req: AuthenticatedRequest, res: Response) => {
  const tenant = await getTenant(req.params.slug);
  if (!tenant) throw new AppError(404, "Unknown tenant", "TENANT_NOT_FOUND");
  res.json({ data: { id: tenant.id, slug: tenant.slug, displayName: tenant.displayName } });
});
