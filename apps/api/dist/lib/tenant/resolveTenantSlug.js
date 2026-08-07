"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantSlug = resolveTenantSlug;
const ROOT_HOST = process.env.TENANT_ROOT_HOST || "localhost";
// Resolves which tenant a request is for, e.g. `acme.localhost:3000` -> "acme".
// An explicit X-Tenant-Slug header takes priority for callers that proxy/rewrite
// the Host header in transit (e.g. apps/web's server-side fetch to apps/api).
// Per PRD_v3_nextjs_express.md §1.2, this resolution is advisory only, exactly
// like a `:tenantId` path param — tenant-context.ts cross-checks it against the
// caller's verified JWT `tenant_id` claim before trusting it for anything.
function resolveTenantSlug(req) {
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.length > 0) {
        return headerSlug.toLowerCase();
    }
    const host = req.hostname; // Express already strips the port from this.
    if (!host || host === ROOT_HOST)
        return null;
    const suffix = `.${ROOT_HOST}`;
    if (!host.endsWith(suffix))
        return null;
    const slug = host.slice(0, -suffix.length);
    return slug.length > 0 ? slug.toLowerCase() : null;
}
//# sourceMappingURL=resolveTenantSlug.js.map