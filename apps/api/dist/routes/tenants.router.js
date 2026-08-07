"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantSettingsRouter = exports.platformTenantsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const phone_1 = require("../lib/phone");
// data_api_v4.md §4 — Platform Console (tenants, tenant_billing). Every route
// here is SUPER_ADMIN-only, global scope; no tenant-context match applies —
// reaching into any given tenant IS the point, and is audit-logged instead.
exports.platformTenantsRouter = (0, express_1.Router)();
exports.platformTenantsRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
const createTenantSchema = zod_1.z
    .object({
    slug: zod_1.z
        .string()
        .min(2)
        .max(63)
        .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric/hyphens"),
    displayName: zod_1.z.string().min(1).max(200),
    adminEmail: zod_1.z.string().email(),
    adminPhone: phone_1.phoneSchema,
    planTier: zod_1.z.enum(["STANDARD", "PRO", "ENTERPRISE"]).default("STANDARD"),
})
    .strict();
// POST /platform/tenants — provisions the tenant + tenant_settings +
// tenant_billing + a default TENANT_ADMIN user, in one transaction
// (sprints_v3.md Sprint 1.1).
exports.platformTenantsRouter.post("/", async (req, res) => {
    const body = createTenantSchema.parse(req.body);
    const { data: invited, error: inviteError } = await supabaseAdmin_1.supabaseAdmin.auth.admin.inviteUserByEmail(body.adminEmail);
    if (inviteError || !invited.user) {
        throw new errorHandler_1.AppError(502, `Failed to invite tenant admin: ${inviteError?.message ?? "unknown error"}`, "INVITE_FAILED");
    }
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => tx.tenant.create({
        data: {
            slug: body.slug,
            displayName: body.displayName,
            planTier: body.planTier,
            provisionedBy: req.user.id,
            settings: { create: {} },
            billing: { create: { planName: body.planTier } },
            users: {
                create: {
                    supabaseAuthUserId: invited.user.id,
                    role: "TENANT_ADMIN",
                    email: body.adminEmail,
                    phone: body.adminPhone,
                    emailIsVerified: !!invited.user.email_confirmed_at,
                },
            },
        },
        include: { settings: true, billing: true, users: true },
    }));
    res.status(201).json({ data: tenant });
});
const listTenantsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED", "ARCHIVED"]).optional(),
    planTier: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
// GET /platform/tenants — list/search. Global list, no per-tenant filter.
exports.platformTenantsRouter.get("/", async (req, res) => {
    const query = listTenantsQuerySchema.parse(req.query);
    const tenants = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => tx.tenant.findMany({
        where: {
            status: query.status,
            planTier: query.planTier,
            ...(query.search && {
                OR: [
                    { slug: { contains: query.search, mode: "insensitive" } },
                    { displayName: { contains: query.search, mode: "insensitive" } },
                ],
            }),
        },
        orderBy: { createdAt: "desc" },
    }));
    res.json({ data: tenants });
});
// GET /platform/tenants/:tenantId — single-tenant deep view. Reading this is
// itself a cross-tenant read for the platform account, so it's audit-logged
// per data_api_v4.md §4/§1.2 ("reason required for anything beyond the
// tenant list/billing dashboard").
exports.platformTenantsRouter.get("/:tenantId", async (req, res) => {
    const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
    if (!reason) {
        throw new errorHandler_1.AppError(400, "A `reason` query param is required to view a tenant's deep view", "REASON_REQUIRED");
    }
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const found = await tx.tenant.findUnique({
            where: { id: req.params.tenantId },
            include: { settings: true, billing: true, users: true },
        });
        if (found) {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: found.id,
                actorUserId: req.user.id,
                actorRole: req.user.role,
                isCrossTenantAccess: true,
                action: "VIEW_TENANT_DEEP_VIEW",
                entityType: "tenants",
                entityId: found.id,
                reason,
            });
        }
        return found;
    });
    if (!tenant)
        throw new errorHandler_1.AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
    res.json({ data: tenant });
});
const patchTenantSchema = zod_1.z
    .object({
    displayName: zod_1.z.string().min(1).max(200).optional(),
    phone: phone_1.optionalPhoneSchema,
    logoUrl: zod_1.z.string().url().optional(),
    themeConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    planTier: zod_1.z.enum(["STANDARD", "PRO", "ENTERPRISE"]).optional(),
    reason: zod_1.z.string().min(1),
})
    .strict();
// PATCH /platform/tenants/:tenantId — cross-tenant write, audit-logged;
// `reason` is mandatory in the body (data_api_v4.md §4).
exports.platformTenantsRouter.patch("/:tenantId", async (req, res) => {
    const { reason, ...updates } = patchTenantSchema.parse(req.body);
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const updated = await tx.tenant.update({
            where: { id: req.params.tenantId },
            data: updates,
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: updated.id,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: true,
            action: "UPDATE_TENANT",
            entityType: "tenants",
            entityId: updated.id,
            reason,
        });
        return updated;
    });
    res.json({ data: tenant });
});
async function setTenantStatus(req, res, status, action) {
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const updated = await tx.tenant.update({
            where: { id: req.params.tenantId },
            data: { status },
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: updated.id,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: true,
            action,
            entityType: "tenants",
            entityId: updated.id,
        });
        return updated;
    });
    res.json({ data: tenant });
}
async function findPendingTenant(tx, tenantId) {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        throw new errorHandler_1.AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
    if (tenant.status !== "PENDING_APPROVAL") {
        throw new errorHandler_1.AppError(409, "Tenant signup has already been reviewed", "TENANT_ALREADY_REVIEWED");
    }
    return tenant;
}
// POST /platform/tenants/:tenantId/approve — moves a self-service signup
// from PENDING_APPROVAL to ACTIVE (auth-register.router.ts's /register-tenant
// is the only route that creates a tenant in PENDING_APPROVAL).
exports.platformTenantsRouter.post("/:tenantId/approve", async (req, res) => {
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        await findPendingTenant(tx, req.params.tenantId);
        const updated = await tx.tenant.update({
            where: { id: req.params.tenantId },
            data: { status: "ACTIVE", reviewedBy: req.user.id, reviewedAt: new Date() },
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: updated.id,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: true,
            action: "APPROVE_TENANT_SIGNUP",
            entityType: "tenants",
            entityId: updated.id,
        });
        return updated;
    });
    res.json({ data: tenant });
    (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => (0, notification_service_1.dispatchTenantApprovalDecision)(tx, { tenantId: tenant.id, approved: true })).catch((err) => {
        console.error("[tenants] approval notification dispatch failed:", err);
    });
});
const rejectTenantSchema = zod_1.z.object({ reason: zod_1.z.string().min(1).max(500) }).strict();
// POST /platform/tenants/:tenantId/reject — moves a self-service signup
// from PENDING_APPROVAL to REJECTED; a reason is required so the tenant
// admin sees why.
exports.platformTenantsRouter.post("/:tenantId/reject", async (req, res) => {
    const body = rejectTenantSchema.parse(req.body);
    const tenant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        await findPendingTenant(tx, req.params.tenantId);
        const updated = await tx.tenant.update({
            where: { id: req.params.tenantId },
            data: {
                status: "REJECTED",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                rejectionReason: body.reason,
            },
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: updated.id,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: true,
            action: "REJECT_TENANT_SIGNUP",
            entityType: "tenants",
            entityId: updated.id,
            reason: body.reason,
        });
        return updated;
    });
    res.json({ data: tenant });
    (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => (0, notification_service_1.dispatchTenantApprovalDecision)(tx, {
        tenantId: tenant.id,
        approved: false,
        rejectionReason: body.reason,
    })).catch((err) => {
        console.error("[tenants] rejection notification dispatch failed:", err);
    });
});
// POST /platform/tenants/:tenantId/suspend
exports.platformTenantsRouter.post("/:tenantId/suspend", (req, res) => setTenantStatus(req, res, "SUSPENDED", "SUSPEND_TENANT"));
// POST /platform/tenants/:tenantId/reinstate
exports.platformTenantsRouter.post("/:tenantId/reinstate", (req, res) => setTenantStatus(req, res, "ACTIVE", "REINSTATE_TENANT"));
// DELETE /platform/tenants/:tenantId — never a hard delete; archives per the
// indefinite-retention rule (schema_ayushman_v3.md §5).
exports.platformTenantsRouter.delete("/:tenantId", (req, res) => setTenantStatus(req, res, "ARCHIVED", "ARCHIVE_TENANT"));
// GET /platform/tenants/:tenantId/billing, PATCH .../billing
exports.platformTenantsRouter.get("/:tenantId/billing", async (req, res) => {
    const billing = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const found = await tx.tenantBilling.findUnique({
            where: { tenantId: req.params.tenantId },
        });
        if (found) {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: req.user.role,
                isCrossTenantAccess: true,
                action: "VIEW_TENANT_BILLING",
                entityType: "tenant_billing",
                entityId: req.params.tenantId,
            });
        }
        return found;
    });
    if (!billing)
        throw new errorHandler_1.AppError(404, "Billing record not found", "TENANT_BILLING_NOT_FOUND");
    res.json({ data: billing });
});
const patchBillingSchema = zod_1.z
    .object({
    planName: zod_1.z.string().min(1).max(100).optional(),
    status: zod_1.z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"]).optional(),
    platformCommissionPct: zod_1.z.number().min(0).max(100).optional(),
})
    .strict();
exports.platformTenantsRouter.patch("/:tenantId/billing", async (req, res) => {
    const updates = patchBillingSchema.parse(req.body);
    const billing = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const updated = await tx.tenantBilling.update({
            where: { tenantId: req.params.tenantId },
            data: updates,
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: req.params.tenantId,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: true,
            action: "UPDATE_TENANT_BILLING",
            entityType: "tenant_billing",
            entityId: req.params.tenantId,
        });
        return updated;
    });
    res.json({ data: billing });
});
// data_api_v4.md §5 — a tenant's own settings/billing view (TENANT_ADMIN, own
// tenant only; SUPER_ADMIN also allowed but that's a cross-tenant read
// covered by the platform routes above, not duplicated here).
exports.tenantSettingsRouter = (0, express_1.Router)({ mergeParams: true });
exports.tenantSettingsRouter.use(require_tenant_match_1.requireTenantMatch);
// requireRole is applied per-route (not as a router-level .use()) because
// this router is mounted at the bare /api/tenants/:tenantId prefix in
// index.ts — a blanket role check here would run for every request under
// that prefix, including sibling routers (appointments, consultants, cases,
// ...) mounted after it, and reject them before they're ever reached.
exports.tenantSettingsRouter.get("/settings", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const settings = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenantSettings.findUnique({ where: { tenantId: req.params.tenantId } }));
    if (!settings)
        throw new errorHandler_1.AppError(404, "Tenant settings not found", "TENANT_SETTINGS_NOT_FOUND");
    res.json({ data: settings });
});
const patchSettingsSchema = zod_1.z
    .object({
    defaultCurrency: zod_1.z.string().length(3).optional(),
    payoutCycle: zod_1.z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
    bookingCutoffHours: zod_1.z.number().int().min(0).optional(),
    autoApproveBookings: zod_1.z.boolean().optional(),
    supportedLanguages: zod_1.z.array(zod_1.z.string()).optional(),
})
    .strict();
exports.tenantSettingsRouter.patch("/settings", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const updates = patchSettingsSchema.parse(req.body);
    const settings = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenantSettings.update({ where: { tenantId: req.params.tenantId }, data: updates }));
    res.json({ data: settings });
});
// Tenant Admin's own organization profile (displayName/phone/address) —
// the fields shown on the template-header.ts contact block prepended to
// message/form templates. Distinct from PATCH /platform/tenants/:tenantId
// above, which is the cross-tenant SUPER_ADMIN write path.
exports.tenantSettingsRouter.get("/profile", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const tenant = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenant.findUnique({
        where: { id: req.params.tenantId },
        select: { displayName: true, phone: true, address: true },
    }));
    if (!tenant)
        throw new errorHandler_1.AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
    res.json({ data: tenant });
});
const patchProfileSchema = zod_1.z
    .object({
    displayName: zod_1.z.string().min(1).max(200).optional(),
    phone: phone_1.optionalPhoneSchema,
    address: zod_1.z.string().max(500).optional(),
})
    .strict();
exports.tenantSettingsRouter.patch("/profile", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const updates = patchProfileSchema.parse(req.body);
    const tenant = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenant.update({
        where: { id: req.params.tenantId },
        data: updates,
        select: { displayName: true, phone: true, address: true },
    }));
    res.json({ data: tenant });
});
// Tenant Admin's own subscription view — deliberately omits any
// platform-internal figures (data_api_v4.md §5's `mrr` note; this schema's
// TenantBilling has no such field, so the whole row is safe to return as-is).
exports.tenantSettingsRouter.get("/billing", (0, require_role_1.requireRole)("TENANT_ADMIN"), async (req, res) => {
    const billing = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenantBilling.findUnique({
        where: { tenantId: req.params.tenantId },
        select: { planName: true, status: true, updatedAt: true },
    }));
    if (!billing)
        throw new errorHandler_1.AppError(404, "Billing record not found", "TENANT_BILLING_NOT_FOUND");
    res.json({ data: billing });
});
//# sourceMappingURL=tenants.router.js.map