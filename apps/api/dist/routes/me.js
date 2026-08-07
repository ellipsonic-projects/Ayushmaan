"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const rls_context_1 = require("@ayushman/db/rls-context");
const callerProfile_1 = require("../lib/callerProfile");
const getTenant_1 = require("../lib/tenant/getTenant");
const errorHandler_1 = require("../middleware/errorHandler");
exports.meRouter = (0, express_1.Router)();
// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
exports.meRouter.get("/me", async (req, res) => {
    // tenant_read_own (supabase/policies/02-tenants.sql) lets a session read
    // its own tenant row by app.tenant_id — exactly the lookup GET /auth/me
    // needs, no super-admin bypass required.
    const tenantId = req.user.tenantId;
    // CLIENT accounts are platform-level and never carry a tenant_id claim
    // (stamp-tenant-claim.sql), so their clientProfileId has to be resolved
    // outside of any tenant context — client_platform_scope RLS grants a
    // client read access to their own client_profiles row regardless of
    // app.tenant_id.
    const clientProfileId = req.user.role === "CLIENT"
        ? await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: false, userId: req.user.id }, (tx) => (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id))
        : null;
    const tenant = tenantId
        ? await (0, rls_context_1.withTenantContext)({ tenantId, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true, status: true, displayName: true, rejectionReason: true },
        }))
        : null;
    // Resolve the caller's display name from their profile row.
    // TENANT_ADMIN and SUPER_ADMIN have no profile table — fullName is null for
    // them and the sidebar will fall back to the email address.
    let fullName = null;
    // Only present for CONSULTANT — lets the web app know whether the
    // post-elevation /complete-profile step still needs to run (destination.ts).
    let consultantOnboarding = null;
    if (req.user.role === "CONSULTANT" && tenantId) {
        const profile = await (0, rls_context_1.withTenantContext)({ tenantId, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.consultantProfile.findUnique({
            where: { userId: req.user.id },
            select: { id: true, fullName: true, onboardingCompletedAt: true },
        }));
        fullName = profile?.fullName ?? null;
        if (profile) {
            consultantOnboarding = {
                consultantId: profile.id,
                completed: !!profile.onboardingCompletedAt,
            };
        }
    }
    else if (req.user.role === "CLIENT") {
        const profile = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.clientProfile.findUnique({
            where: { userId: req.user.id },
            select: { fullName: true },
        }));
        fullName = profile?.fullName ?? null;
    }
    res.json({
        data: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            tenantId: req.user.tenantId,
            tenant,
            clientProfileId,
            fullName,
            consultantOnboarding,
            emailIsVerified: req.user.emailIsVerified,
        },
    });
});
// GET /auth/tenant-by-slug/:slug — resolves a tenant's id from its slug for
// an already-authenticated caller. Mounted alongside GET /auth/me, ahead of
// tenantContextMiddleware, since it exists precisely to discover a tenantId
// before one is known — needed by platform-level CLIENT accounts (no
// tenant_id JWT claim) to address a tenant-scoped route from a page's URL
// slug (apps/web's clients.server.ts).
exports.meRouter.get("/tenant-by-slug/:slug", async (req, res) => {
    const tenant = await (0, getTenant_1.getTenant)(req.params.slug);
    if (!tenant)
        throw new errorHandler_1.AppError(404, "Unknown tenant", "TENANT_NOT_FOUND");
    res.json({ data: { id: tenant.id, slug: tenant.slug, displayName: tenant.displayName } });
});
//# sourceMappingURL=me.js.map