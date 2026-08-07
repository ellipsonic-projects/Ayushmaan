"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantMatch = void 0;
const errorHandler_1 = require("./errorHandler");
// Guards routes that carry `:tenantId` in the path (data_api_v4.md §1.2
// convention: e.g. GET /tenants/:tenantId/settings). The path segment is
// advisory — this checks it against the tenant already verified by
// tenant-context.ts, not the other way around. Must run after
// tenantContextMiddleware.
const requireTenantMatch = (req, res, next) => {
    if (!req.tenantContext) {
        return next(new errorHandler_1.AppError(500, "Tenant context missing", "TENANT_CONTEXT_MISSING"));
    }
    if (req.tenantContext.isSuperAdmin) {
        return next();
    }
    if (req.params.tenantId !== req.tenantContext.tenantId) {
        return next(new errorHandler_1.AppError(403, "Forbidden", "TENANT_MISMATCH"));
    }
    next();
};
exports.requireTenantMatch = requireTenantMatch;
//# sourceMappingURL=require-tenant-match.js.map