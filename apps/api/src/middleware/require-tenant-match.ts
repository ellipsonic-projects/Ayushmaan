import { Response, NextFunction } from "express";
import { TenantScopedRequest } from "./tenant-context";
import { AppError } from "./errorHandler";

// Guards routes that carry `:tenantId` in the path (data_api_v4.md §1.2
// convention: e.g. GET /tenants/:tenantId/settings). The path segment is
// advisory — this checks it against the tenant already verified by
// tenant-context.ts, not the other way around. Must run after
// tenantContextMiddleware.
export const requireTenantMatch = (req: TenantScopedRequest, res: Response, next: NextFunction) => {
  if (!req.tenantContext) {
    return next(new AppError(500, "Tenant context missing", "TENANT_CONTEXT_MISSING"));
  }
  if (req.tenantContext.isSuperAdmin) {
    return next();
  }
  if (req.params.tenantId !== req.tenantContext.tenantId) {
    return next(new AppError(403, "Forbidden", "TENANT_MISMATCH"));
  }
  next();
};
