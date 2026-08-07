"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRegisterRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const auth_1 = require("../lib/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const notification_service_1 = require("../services/notification.service");
const phone_1 = require("../lib/phone");
exports.authRegisterRouter = (0, express_1.Router)();
const registerProfileSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200),
    phone: phone_1.phoneSchema,
    dob: zod_1.z.string().date().optional(),
    preferredLanguage: zod_1.z.string().max(50).optional(),
    timezone: zod_1.z.string().max(50).optional(),
    emergencyContactName: zod_1.z.string().max(200).optional(),
    emergencyContactPhone: phone_1.optionalPhoneSchema,
})
    .strict();
// POST /auth/register-profile — docs/api-patterns.md §3. Mounted in index.ts
// ahead of authMiddleware, which 401s ("No matching account") when no
// `users` row exists yet — exactly the state a brand-new CLIENT signup is
// in right after Supabase Auth issues its token. Verifies the token itself
// instead of relying on req.user, then creates `users` + `client_profiles`.
exports.authRegisterRouter.post("/register-profile", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        throw new errorHandler_1.AppError(401, "Unauthorized", "UNAUTHORIZED");
    const identity = await auth_1.authVerifier.verifyToken(token);
    if (!identity)
        throw new errorHandler_1.AppError(401, "Invalid token", "INVALID_TOKEN");
    const body = registerProfileSchema.parse(req.body);
    const profile = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: identity.providerId }, async (tx) => {
        const existing = await tx.user.findUnique({
            where: { supabaseAuthUserId: identity.providerId },
            include: { clientProfile: true },
        });
        if (existing)
            return existing;
        return tx.user.create({
            data: {
                supabaseAuthUserId: identity.providerId,
                role: "CLIENT",
                email: identity.email,
                emailIsVerified: identity.emailVerified,
                phone: body.phone,
                clientProfile: {
                    create: {
                        fullName: body.fullName,
                        ...(body.dob && { dob: new Date(body.dob) }),
                        ...(body.preferredLanguage && { preferredLanguage: body.preferredLanguage }),
                        ...(body.timezone && { timezone: body.timezone }),
                        ...(body.emergencyContactName && { emergencyContactName: body.emergencyContactName }),
                        ...(body.emergencyContactPhone && {
                            emergencyContactPhone: body.emergencyContactPhone,
                        }),
                    },
                },
            },
            include: { clientProfile: true },
        });
    });
    res.status(201).json({ data: profile });
});
const registerTenantSchema = zod_1.z
    .object({
    slug: zod_1.z
        .string()
        .min(2)
        .max(63)
        .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric/hyphens"),
    displayName: zod_1.z.string().min(1).max(200),
    phone: phone_1.phoneSchema,
    address: zod_1.z.string().max(500).optional(),
    planTier: zod_1.z.enum(["STANDARD", "PRO", "ENTERPRISE"]).default("STANDARD"),
})
    .strict();
// POST /auth/register-tenant — self-service tenant provisioning. Mirrors
// register-profile's placement (ahead of authMiddleware, verifies the
// Supabase token itself) but creates a Tenant + tenant_settings +
// tenant_billing + a TENANT_ADMIN `users` row instead of a client profile.
// Distinct from POST /platform/tenants (tenants.router.ts), which stays the
// Super-Admin invite-based path for provisioning a tenant on someone else's
// behalf; this route is for an admin setting up their own practice with a
// password they chose during signUp. The tenant starts PENDING_APPROVAL —
// a SUPER_ADMIN must approve/reject it (tenants.router.ts) before it can
// go ACTIVE; the TENANT_ADMIN can still sign in and see a pending screen.
exports.authRegisterRouter.post("/register-tenant", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        throw new errorHandler_1.AppError(401, "Unauthorized", "UNAUTHORIZED");
    const identity = await auth_1.authVerifier.verifyToken(token);
    if (!identity)
        throw new errorHandler_1.AppError(401, "Invalid token", "INVALID_TOKEN");
    const body = registerTenantSchema.parse(req.body);
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: identity.providerId }, async (tx) => {
        const existingUser = await tx.user.findUnique({
            where: { supabaseAuthUserId: identity.providerId },
        });
        if (existingUser) {
            throw new errorHandler_1.AppError(409, "This account is already registered", "ALREADY_REGISTERED");
        }
        const existingSlug = await tx.tenant.findUnique({ where: { slug: body.slug } });
        if (existingSlug) {
            throw new errorHandler_1.AppError(409, "This slug is already taken", "SLUG_TAKEN");
        }
        return tx.tenant.create({
            data: {
                slug: body.slug,
                displayName: body.displayName,
                address: body.address,
                planTier: body.planTier,
                status: "PENDING_APPROVAL",
                settings: { create: {} },
                billing: { create: { planName: body.planTier } },
                users: {
                    create: {
                        supabaseAuthUserId: identity.providerId,
                        role: "TENANT_ADMIN",
                        email: identity.email,
                        emailIsVerified: identity.emailVerified,
                        phone: body.phone,
                    },
                },
            },
            include: { settings: true, billing: true, users: true },
        });
    });
    res.status(201).json({ data: tenant });
    // Fire-and-forget, same as the consultant-application approve flow —
    // notification delivery must not block the signup response.
    (0, rls_context_1.withTenantContext)({ tenantId: tenant.id, isSuperAdmin: true, userId: identity.providerId }, (tx) => (0, notification_service_1.dispatchTenantSignupPending)(tx, {
        tenantId: tenant.id,
        tenantDisplayName: tenant.displayName,
    })).catch((err) => {
        console.error("[auth-register] tenant signup pending notification dispatch failed:", err);
    });
});
//# sourceMappingURL=auth-register.router.js.map