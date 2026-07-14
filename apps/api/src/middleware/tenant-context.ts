import { Response, NextFunction } from "express";
import type { TenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "./auth";
import { AppError } from "./errorHandler";
import { getTenant } from "../lib/tenant/getTenant";
import { resolveTenantSlug } from "../lib/tenant/resolveTenantSlug";

export interface TenantScopedRequest extends AuthenticatedRequest {
  tenant?: { id: string; slug: string; displayName: string; status: string };
  tenantContext?: TenantContext;
}

// The real enforcement boundary (PRD_v3_nextjs_express.md §1.2/§7.3,
// schema_ayushman_v3.md §4.1). Must run after authMiddleware.
//
// The tenant slug resolved here (from the request's Host header, e.g.
// `acme.localhost:3000`, or an X-Tenant-Slug header) is advisory only —
// exactly like a `:tenantId` path param. It is cross-checked against the
// caller's verified JWT `tenant_id` claim (req.user.tenantId) before being
// trusted for anything; a mismatch is rejected outright for anyone but a
// SUPER_ADMIN. Only once that check passes does this middleware attach the
// TenantContext that every route handler must pass into withTenantContext()
// to open its RLS-scoped transaction.
export const tenantContextMiddleware = async (
  req: TenantScopedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError(401, "Unauthorized"));
  }

  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  const slug = resolveTenantSlug(req);

  if (!slug) {
    // No tenant to resolve — only valid for a Super Admin acting platform-wide.
    if (!isSuperAdmin) {
      return next(
        new AppError(400, "Tenant could not be resolved from the request", "TENANT_REQUIRED")
      );
    }
    req.tenantContext = { tenantId: null, isSuperAdmin: true, userId: req.user.id };
    return next();
  }

  const tenant = await getTenant(slug);
  if (!tenant) {
    return next(new AppError(404, "Unknown tenant", "TENANT_NOT_FOUND"));
  }
  if (tenant.status !== "ACTIVE") {
    return next(new AppError(403, "This practice is unavailable", "TENANT_SUSPENDED"));
  }

  if (!isSuperAdmin && req.user.tenantId !== tenant.id) {
    return next(new AppError(403, "Forbidden", "TENANT_MISMATCH"));
  }

  req.tenant = {
    id: tenant.id,
    slug: tenant.slug,
    displayName: tenant.displayName,
    status: tenant.status,
  };
  req.tenantContext = { tenantId: tenant.id, isSuperAdmin, userId: req.user.id };
  next();
};
