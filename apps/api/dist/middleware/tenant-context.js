"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContextMiddleware = void 0;
const errorHandler_1 = require("./errorHandler");
const getTenant_1 = require("../lib/tenant/getTenant");
const resolveTenantSlug_1 = require("../lib/tenant/resolveTenantSlug");
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
const tenantContextMiddleware = async (req, res, next) => {
    if (!req.user) {
        return next(new errorHandler_1.AppError(401, "Unauthorized"));
    }
    const isSuperAdmin = req.user.role === "SUPER_ADMIN";
    const slug = (0, resolveTenantSlug_1.resolveTenantSlug)(req);
    if (!slug) {
        // No tenant to resolve — only valid for a Super Admin acting platform-wide.
        if (!isSuperAdmin) {
            return next(new errorHandler_1.AppError(400, "Tenant could not be resolved from the request", "TENANT_REQUIRED"));
        }
        req.tenantContext = { tenantId: null, isSuperAdmin: true, userId: req.user.id };
        return next();
    }
    const tenant = await (0, getTenant_1.getTenant)(slug);
    if (!tenant) {
        return next(new errorHandler_1.AppError(404, "Unknown tenant", "TENANT_NOT_FOUND"));
    }
    if (tenant.status !== "ACTIVE") {
        return next(new errorHandler_1.AppError(403, "This practice is unavailable", "TENANT_SUSPENDED"));
    }
    if (!isSuperAdmin && req.user.tenantId !== tenant.id) {
        return next(new errorHandler_1.AppError(403, "Forbidden", "TENANT_MISMATCH"));
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
exports.tenantContextMiddleware = tenantContextMiddleware;
//# sourceMappingURL=tenant-context.js.map