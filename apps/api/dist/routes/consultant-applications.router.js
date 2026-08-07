"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consultantApplicationsRouter = exports.platformConsultantApplicationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const notification_service_1 = require("../services/notification.service");
const availability_service_1 = require("../services/availability.service");
const workflow_events_1 = require("../lib/workflow-events");
const CATEGORIES = ["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"];
const createApplicationSchema = zod_1.z
    .object({
    code: zod_1.z.string().regex(/^[A-Z0-9]{10}$/, "Code must be 10 alphanumeric characters"),
    category: zod_1.z.enum(CATEGORIES),
    subSpecialization: zod_1.z.string().max(150).optional(),
    bio: zod_1.z.string().optional(),
    consultationFee: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    languagesSpoken: zod_1.z.array(zod_1.z.string()).optional(),
    message: zod_1.z.string().optional(),
})
    .strict();
// Self-serve "become a consultant" flow, mounted at /api/clients (platform-
// level, mirrors platformClientsRouter's GET /tenants directory search) —
// a CLIENT account has no tenantId, so these routes resolve tenant scope
// from the body/params rather than from tenant-context middleware.
exports.platformConsultantApplicationsRouter = (0, express_1.Router)();
// POST /clients/consultant-applications — CLIENT redeems a 10-character invite
// code a TENANT_ADMIN generated and sent them out-of-band
// (consultant-invite-codes.router.ts) to apply to become a CONSULTANT under
// that tenant. The code both identifies the tenant and proves the admin
// actually invited this person, replacing the old "search any org and
// apply" self-serve flow.
exports.platformConsultantApplicationsRouter.post("/", (0, require_role_1.requireRole)("CLIENT"), async (req, res) => {
    const body = createApplicationSchema.parse(req.body);
    const application = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: false, userId: req.user.id }, async (tx) => {
        const inviteCode = await tx.consultantInviteCode.findUnique({ where: { code: body.code } });
        if (!inviteCode || inviteCode.status !== "ACTIVE" || inviteCode.expiresAt < new Date()) {
            throw new errorHandler_1.AppError(404, "Invite code not found or expired", "INVITE_CODE_NOT_FOUND");
        }
        const tenant = await tx.tenant.findUnique({ where: { id: inviteCode.tenantId } });
        if (!tenant || tenant.status !== "ACTIVE") {
            throw new errorHandler_1.AppError(404, "Organization not found", "TENANT_NOT_FOUND");
        }
        const existingPending = await tx.consultantApplication.findFirst({
            where: { userId: req.user.id, tenantId: inviteCode.tenantId, status: "PENDING" },
        });
        if (existingPending) {
            throw new errorHandler_1.AppError(409, "You already have a pending application to this organization", "APPLICATION_ALREADY_PENDING");
        }
        await tx.consultantInviteCode.update({
            where: { id: inviteCode.id },
            data: { status: "USED", usedBy: req.user.id, usedAt: new Date() },
        });
        const created = await tx.consultantApplication.create({
            data: {
                tenantId: inviteCode.tenantId,
                userId: req.user.id,
                inviteCodeId: inviteCode.id,
                category: body.category,
                subSpecialization: body.subSpecialization,
                bio: body.bio,
                ...(body.consultationFee !== undefined && { consultationFee: body.consultationFee }),
                ...(body.currency && { currency: body.currency }),
                ...(body.languagesSpoken && { languagesSpoken: body.languagesSpoken }),
                message: body.message,
            },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, inviteCode.tenantId, "CONSULTANT_APPLICATION_SUBMITTED", {
            application: { id: created.id, category: created.category },
        });
        return created;
    });
    res.status(201).json({ data: application });
});
// GET /clients/consultant-applications/me — the CLIENT's own application
// history, across every tenant they've applied to.
exports.platformConsultantApplicationsRouter.get("/me", (0, require_role_1.requireRole)("CLIENT"), async (req, res) => {
    const applications = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.consultantApplication.findMany({
        where: { userId: req.user.id },
        include: { tenant: { select: { displayName: true, slug: true, logoUrl: true } } },
        orderBy: { createdAt: "desc" },
    }));
    res.json({ data: applications });
});
// Tenant-admin review queue, mounted at /api/tenants/:tenantId/consultant-applications.
exports.consultantApplicationsRouter = (0, express_1.Router)({ mergeParams: true });
exports.consultantApplicationsRouter.use(require_tenant_match_1.requireTenantMatch);
const listQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
// GET /tenants/:tenantId/consultant-applications
exports.consultantApplicationsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const applications = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.consultantApplication.findMany({
        where: { tenantId: req.params.tenantId, ...(query.status && { status: query.status }) },
        include: { user: { select: { email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
    }));
    res.json({ data: applications });
});
async function findPendingApplication(tx, tenantId, applicationId) {
    const application = await tx.consultantApplication.findUnique({ where: { id: applicationId } });
    if (!application || application.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    }
    if (application.status !== "PENDING") {
        throw new errorHandler_1.AppError(409, "Application has already been reviewed", "APPLICATION_ALREADY_REVIEWED");
    }
    return application;
}
// POST /tenants/:tenantId/consultant-applications/:id/approve — converts the
// applicant's User in place (role -> CONSULTANT, tenantId set) and creates
// their ConsultantProfile from the fields captured on the application, the
// same mechanics as consultants.router.ts's admin-invite POST /consultants.
exports.consultantApplicationsRouter.post("/:id/approve", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const profile = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const application = await findPendingApplication(tx, req.params.tenantId, req.params.id);
        const applicant = await tx.clientProfile.findUnique({
            where: { userId: application.userId },
        });
        if (!applicant) {
            throw new errorHandler_1.AppError(404, "Applicant profile not found", "CLIENT_PROFILE_NOT_FOUND");
        }
        const updatedUser = await tx.user.update({
            where: { id: application.userId },
            data: {
                role: "CONSULTANT",
                tenantId: req.params.tenantId,
                consultantProfile: {
                    create: {
                        tenantId: req.params.tenantId,
                        fullName: applicant.fullName,
                        category: application.category,
                        subSpecialization: application.subSpecialization,
                        bio: application.bio,
                        consultationFee: application.consultationFee,
                        currency: application.currency,
                        languagesSpoken: application.languagesSpoken,
                        invitedBy: req.user.id,
                    },
                },
            },
            include: { consultantProfile: true },
        });
        if (updatedUser.consultantProfile) {
            await (0, availability_service_1.applyTenantAvailabilityDefaults)(tx, req.params.tenantId, updatedUser.consultantProfile.id);
        }
        await tx.consultantApplication.update({
            where: { id: application.id },
            data: { status: "APPROVED", reviewedBy: req.user.id, reviewedAt: new Date() },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CONSULTANT_APPLICATION_APPROVED", {
            application: { id: application.id },
        });
        if (updatedUser.consultantProfile) {
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CONSULTANT_ONBOARDED", {
                consultant: {
                    id: updatedUser.consultantProfile.id,
                    fullName: updatedUser.consultantProfile.fullName,
                    category: updatedUser.consultantProfile.category,
                },
            });
        }
        return updatedUser;
    });
    res.json({ data: profile });
    // Fire-and-forget: notification delivery (email) must not block the
    // approve response — dispatch() already catches per-channel send errors,
    // this just guards the outer transaction wrapper too.
    (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => (0, notification_service_1.dispatchConsultantOnboarded)(tx, {
        tenantId: req.params.tenantId,
        newConsultantName: profile.consultantProfile.fullName,
        excludeUserId: profile.id,
    })).catch((err) => {
        console.error("[consultant-applications] onboarded notification dispatch failed:", err);
    });
});
const rejectSchema = zod_1.z.object({ reason: zod_1.z.string().max(500).optional() }).strict();
// POST /tenants/:tenantId/consultant-applications/:id/reject
exports.consultantApplicationsRouter.post("/:id/reject", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = rejectSchema.parse(req.body ?? {});
    const application = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await findPendingApplication(tx, req.params.tenantId, req.params.id);
        const result = await tx.consultantApplication.update({
            where: { id: found.id },
            data: {
                status: "REJECTED",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                rejectionReason: body.reason,
            },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CONSULTANT_APPLICATION_REJECTED", {
            application: { id: result.id, rejectionReason: body.reason },
        });
        return result;
    });
    res.json({ data: application });
});
//# sourceMappingURL=consultant-applications.router.js.map