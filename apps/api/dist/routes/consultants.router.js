"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityDefaultsRouter = exports.outOfOfficeRouter = exports.availabilitySlotsRouter = exports.verificationDocumentsRouter = exports.consultantsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const availability_service_1 = require("../services/availability.service");
const booking_service_1 = require("../services/booking.service");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
const phone_1 = require("../lib/phone");
// data_api_v4.md §8 — consultant_profiles, availability_slots,
// out_of_office_periods. Mounted at /api/tenants/:tenantId/consultants.
exports.consultantsRouter = (0, express_1.Router)({ mergeParams: true });
exports.consultantsRouter.use(require_tenant_match_1.requireTenantMatch);
// GET /tenants/:tenantId/consultants — CLIENT sees only consultants
// currently accepting new clients (booking-relevant); TENANT_ADMIN,
// SUPER_ADMIN and CONSULTANT see the full tenant roster.
exports.consultantsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT", "CLIENT"), async (req, res) => {
    const today = new Date();
    const consultants = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await tx.consultantProfile.findMany({
            where: {
                tenantId: req.params.tenantId,
                ...(req.user.role === "CLIENT" && { isAcceptingNewClients: true }),
            },
            include: {
                user: { select: { email: true, accountStatus: true } },
                _count: { select: { cases: true } },
                outOfOfficePeriods: {
                    where: { startDate: { lte: today }, endDate: { gte: today } },
                    select: { id: true },
                    take: 1,
                },
            },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "LIST_CONSULTANTS",
                entityType: "ConsultantProfile",
            });
        }
        return found;
    });
    res.json({ data: consultants });
});
const createConsultantSchema = zod_1.z
    .object({
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string().min(1).max(200),
    phone: phone_1.phoneSchema,
    category: zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
})
    .strict();
// POST /tenants/:tenantId/consultants — invites a Consultant: creates users
// (role=CONSULTANT) + consultant_profiles. invitedBy is set server-side.
exports.consultantsRouter.post("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createConsultantSchema.parse(req.body);
    const { data: invited, error: inviteError } = await supabaseAdmin_1.supabaseAdmin.auth.admin.inviteUserByEmail(body.email);
    if (inviteError || !invited.user) {
        throw new errorHandler_1.AppError(502, `Failed to invite consultant: ${inviteError?.message ?? "unknown error"}`, "INVITE_FAILED");
    }
    const profile = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const created = await tx.user.create({
            data: {
                supabaseAuthUserId: invited.user.id,
                tenantId: req.params.tenantId,
                role: "CONSULTANT",
                email: body.email,
                phone: body.phone,
                emailIsVerified: !!invited.user.email_confirmed_at,
                consultantProfile: {
                    create: {
                        tenantId: req.params.tenantId,
                        fullName: body.fullName,
                        category: body.category,
                        invitedBy: req.user.id,
                    },
                },
            },
            include: { consultantProfile: true },
        });
        if (created.consultantProfile) {
            await (0, availability_service_1.applyTenantAvailabilityDefaults)(tx, req.params.tenantId, created.consultantProfile.id);
        }
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "CREATE",
                entityType: "ConsultantProfile",
                entityId: created.consultantProfile?.id,
            });
        }
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CONSULTANT_ONBOARDED", {
            consultant: {
                id: created.consultantProfile.id,
                fullName: body.fullName,
                category: body.category,
            },
        });
        return created;
    });
    await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => (0, notification_service_1.dispatchConsultantOnboarded)(tx, {
        tenantId: req.params.tenantId,
        newConsultantName: body.fullName,
        excludeUserId: profile.id,
    }));
    res.status(201).json({ data: profile });
});
async function findConsultant(tx, tenantId, consultantId) {
    const consultant = await tx.consultantProfile.findUnique({ where: { id: consultantId } });
    if (!consultant || consultant.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
    }
    return consultant;
}
function assertSelfMatchesOrAdmin(req, ownConsultantId, consultantId) {
    if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN")
        return;
    if (ownConsultantId !== consultantId)
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
}
// GET /tenants/:tenantId/consultants/:consultantId
exports.consultantsRouter.get("/:consultantId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"), async (req, res) => {
    const consultant = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        const found = await tx.consultantProfile.findUnique({
            where: { id: req.params.consultantId },
            include: {
                user: { select: { email: true, accountStatus: true } },
                _count: { select: { cases: true } },
            },
        });
        if (!found || found.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "READ",
                entityType: "ConsultantProfile",
                entityId: found.id,
            });
        }
        return found;
    });
    res.json({ data: consultant });
});
const patchConsultantSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200).optional(),
    category: zod_1.z
        .enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"])
        .optional(),
    bio: zod_1.z.string().optional(),
    consultationFee: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    timezone: zod_1.z.string().min(1).max(50).optional(),
    languagesSpoken: zod_1.z.array(zod_1.z.string()).optional(),
    subSpecialization: zod_1.z.string().max(150).optional(),
    isAcceptingNewClients: zod_1.z.boolean().optional(),
    autoApproveBookings: zod_1.z.boolean().optional(),
    paymentTiming: zod_1.z.enum(["PAY_ON_BOOKING", "PAY_AFTER_SESSION"]).optional(),
    onboardingCompleted: zod_1.z.boolean().optional(), // sets onboardingCompletedAt = now(); marks the post-elevation /complete-profile step done
})
    .strict();
// PATCH /tenants/:tenantId/consultants/:consultantId — self, TENANT_ADMIN, SUPER_ADMIN.
exports.consultantsRouter.patch("/:consultantId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const { onboardingCompleted, ...updates } = patchConsultantSchema.parse(req.body);
    // Pricing is a TENANT_ADMIN decision — a consultant may edit every other
    // field on their own profile, but never their own consultationFee.
    if (req.user.role === "CONSULTANT" && updates.consultationFee !== undefined) {
        throw new errorHandler_1.AppError(403, "Only a tenant admin can set the consultation fee", "FEE_ADMIN_ONLY");
    }
    const consultant = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        const updated = await tx.consultantProfile.update({
            where: { id: req.params.consultantId },
            data: {
                ...updates,
                ...(onboardingCompleted && { onboardingCompletedAt: new Date() }),
            },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "UPDATE",
                entityType: "ConsultantProfile",
                entityId: req.params.consultantId,
            });
        }
        return updated;
    });
    res.json({ data: consultant });
});
// DELETE /tenants/:tenantId/consultants/:consultantId — deactivates only
// (via the linked User's accountStatus; case history is never deleted —
// consultant_profiles itself carries no status column).
exports.consultantsRouter.delete("/:consultantId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const consultant = await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        await tx.user.update({
            where: { id: consultant.userId },
            data: { accountStatus: "SUSPENDED" },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "DELETE",
                entityType: "ConsultantProfile",
                entityId: consultant.id,
            });
        }
    });
    res.status(204).send();
});
const createConsultantAppointmentSchema = zod_1.z
    .object({
    clientId: zod_1.z.string().uuid(),
    caseMode: zod_1.z.enum(["NEW", "EXISTING"]),
    caseId: zod_1.z.string().uuid().optional(),
    category: zod_1.z
        .enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"])
        .optional(),
    matterKey: zod_1.z.string().max(150).optional(),
    scheduledStart: zod_1.z.string(),
    scheduledEnd: zod_1.z.string(),
    slotId: zod_1.z.string().uuid().optional(),
})
    .strict()
    .refine((b) => b.caseMode !== "EXISTING" || !!b.caseId, {
    message: "caseId is required when caseMode is EXISTING",
    path: ["caseId"],
})
    .refine((b) => b.caseMode !== "NEW" || !!b.category, {
    message: "category is required when caseMode is NEW",
    path: ["category"],
});
// POST /tenants/:tenantId/consultants/:consultantId/appointments — self only.
// instructions.md §1: consultant-initiated ad-hoc booking for an existing
// client, with an explicit new/existing case choice instead of the silent
// (client_id, consultant_id, category, matterKey) auto-match the public
// booking flow uses. Status defaults straight to APPROVED — the consultant
// creating this booking IS the confirmation, so there's no REQUESTED review
// stage the way there is for a client-initiated booking.
exports.consultantsRouter.post("/:consultantId/appointments", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createConsultantAppointmentSchema.parse(req.body);
    const scheduledStart = new Date(body.scheduledStart);
    const scheduledEnd = new Date(body.scheduledEnd);
    const appointment = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!ownId || ownId !== req.params.consultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        }
        const client = await tx.clientProfile.findUnique({ where: { id: body.clientId } });
        if (!client) {
            throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
        }
        let caseRow;
        if (body.caseMode === "EXISTING") {
            const existing = await tx.case.findUnique({ where: { id: body.caseId } });
            if (!existing ||
                existing.tenantId !== req.params.tenantId ||
                existing.clientId !== body.clientId ||
                existing.consultantId !== ownId ||
                existing.status === "CLOSED" ||
                existing.deletedAt) {
                throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
            }
            caseRow = existing;
        }
        else {
            const { case: created, isNew } = await (0, booking_service_1.createOrReuseCase)(tx, {
                tenantId: req.params.tenantId,
                clientId: body.clientId,
                consultantId: ownId,
                category: body.category,
                matterKey: body.matterKey,
                // "Start New Case" is an explicit choice made alongside an
                // explicit "Use this case" list of the client's ACTIVE cases —
                // never silently fold this into a case the consultant didn't
                // pick (e.g. one that's ON_HOLD/PENDING_ASSIGNMENT and so
                // wasn't shown in that list).
                dedupe: false,
            });
            caseRow = created;
            // The "new client" moment a consultant's workflow can hook a
            // SEND_INTAKE_FORM node onto via an EVENT trigger — see the
            // matching call in cases.router.ts's POST /.
            if (isNew) {
                await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "NEW_CLIENT", await (0, workflow_context_1.buildCaseContext)(tx, created.id));
            }
        }
        await (0, booking_service_1.assertGuardianConsentIfMinor)(tx, caseRow.clientId);
        if (body.slotId) {
            const slot = await tx.availabilitySlot.findUnique({ where: { id: body.slotId } });
            if (!slot || slot.tenantId !== req.params.tenantId || slot.consultantId !== ownId) {
                throw new errorHandler_1.AppError(404, "Slot not found", "SLOT_NOT_FOUND");
            }
            // Optimistic-lock the slot (same pattern as PATCH /availability-slots/:slotId)
            // instead of re-checking appointment-overlap conflicts below.
            const { count } = await tx.availabilitySlot.updateMany({
                where: { id: slot.id, version: slot.version, status: "OPEN" },
                data: { status: "BOOKED", version: { increment: 1 } },
            });
            if (count === 0) {
                throw new errorHandler_1.AppError(409, "Slot was booked elsewhere; refresh and retry", "SLOT_VERSION_CONFLICT");
            }
        }
        else {
            await (0, booking_service_1.assertNoConflict)(tx, { consultantId: ownId, scheduledStart, scheduledEnd });
        }
        await (0, booking_service_1.assertNoOutOfOfficeConflict)(tx, { consultantId: ownId, scheduledStart });
        return tx.appointment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                scheduledStart,
                scheduledEnd,
                status: "APPROVED",
            },
        });
    });
    res.status(201).json({ data: appointment });
});
// GET /tenants/:tenantId/consultants/:consultantId/verification-documents —
// self, TENANT_ADMIN. Display-only read; no platform approval workflow
// exists (schema §3.25).
exports.consultantsRouter.get("/:consultantId/verification-documents", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const documents = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.consultantVerificationDocument.findMany({
            where: { consultantId: req.params.consultantId },
        });
    });
    res.json({ data: documents });
});
// GET /tenants/:tenantId/consultants/:consultantId/commitments — self only.
// Not in data_api_v4.md §14, which only defines per-case commitment reads
// (/cases/:caseId/commitments) — this aggregate mirrors the same
// spec-deviation precedent as appointmentsRouter's tenant-wide GET /, added
// because the consultant dashboard's "Critical Commitments" widget needs a
// single cross-case worklist rather than one request per case.
exports.consultantsRouter.get("/:consultantId/commitments", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const commitments = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (ownId !== req.params.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        return tx.commitment.findMany({
            where: { status: "ACTIVE", case: { consultantId: req.params.consultantId } },
            include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
            orderBy: { createdAt: "asc" },
        });
    });
    res.json({ data: commitments });
});
// GET /tenants/:tenantId/consultants/:consultantId/tasks — self only. Same
// spec-deviation precedent as the commitments aggregate above; data_api_v4.md
// §14 only defines /cases/:caseId/tasks.
exports.consultantsRouter.get("/:consultantId/tasks", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const tasks = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (ownId !== req.params.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        return tx.task.findMany({
            where: {
                assignedTo: "CONSULTANT",
                status: { in: ["OPEN", "OVERDUE"] },
                case: { consultantId: req.params.consultantId },
            },
            include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
            orderBy: { dueAt: { sort: "asc", nulls: "last" } },
        });
    });
    res.json({ data: tasks });
});
// data_api_v4.md §8 puts this route at
// /tenants/:tenantId/verification-documents/:docId, a sibling of
// /consultants rather than nested under it — exported separately so
// index.ts can mount it at the matching path.
exports.verificationDocumentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.verificationDocumentsRouter.use(require_tenant_match_1.requireTenantMatch);
// DELETE /tenants/:tenantId/verification-documents/:docId — self, TENANT_ADMIN.
exports.verificationDocumentsRouter.delete("/:docId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const doc = await tx.consultantVerificationDocument.findUnique({
            where: { id: req.params.docId },
        });
        if (!doc || doc.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, doc.consultantId);
        }
        await tx.consultantVerificationDocument.delete({ where: { id: req.params.docId } });
    });
    res.status(204).send();
});
const availabilityQuerySchema = zod_1.z.object({
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
const CLIENT_AVAILABILITY_WINDOW_DAYS = 90;
// GET /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN see every raw template row regardless of status, for the
// admin "manage availability" UI that edits/deletes by slotId, plus
// `clientVisibleSlots`: the same discrete bookable instants a CLIENT would
// see, so a consultant/admin preview never drifts from what book-page shows.
// CLIENT (book-page slot picker) gets only the discrete list as `data` —
// every instant stepped from each template's startTime..endTime by
// slotDurationMins, across [from, to] (defaulting to today..+90d), with
// instances inside the tenant's booking_cutoff_hours window or overlapping
// an existing appointment already excluded server-side
// (generateDiscreteAvailability).
exports.consultantsRouter.get("/:consultantId/availability", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "CLIENT"), async (req, res) => {
    const query = availabilityQuerySchema.parse(req.query);
    const { slots, clientVisibleSlots } = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        const isClient = req.user.role === "CLIENT";
        const from = query.from
            ? new Date(query.from)
            : new Date(new Date().toISOString().slice(0, 10));
        const to = query.to
            ? new Date(query.to)
            : new Date(from.getTime() + CLIENT_AVAILABILITY_WINDOW_DAYS * 86400000);
        const found = await tx.availabilitySlot.findMany({
            where: {
                consultantId: req.params.consultantId,
                ...(isClient && { status: "OPEN" }),
                ...(isClient
                    ? { OR: [{ specificDate: null }, { specificDate: { gte: from, lte: to } }] }
                    : (query.from || query.to) && {
                        specificDate: {
                            ...(query.from && { gte: new Date(query.from) }),
                            ...(query.to && { lte: new Date(query.to) }),
                        },
                    }),
            },
        });
        const settings = await tx.tenantSettings.findUnique({
            where: { tenantId: req.params.tenantId },
            select: { bookingCutoffHours: true },
        });
        const cutoffMs = (settings?.bookingCutoffHours ?? 2) * 60 * 60 * 1000;
        const appointments = await tx.appointment.findMany({
            where: {
                status: { notIn: ["CANCELLED"] },
                scheduledStart: { lt: to },
                scheduledEnd: { gt: from },
                case: { consultantId: req.params.consultantId },
            },
            select: { scheduledStart: true, scheduledEnd: true },
        });
        if (isClient) {
            const discrete = (0, availability_service_1.generateDiscreteAvailability)(found, appointments, from, to, cutoffMs, Date.now());
            return { slots: discrete, clientVisibleSlots: discrete };
        }
        // Non-client roles still see the discrete list a client would get —
        // computed from the OPEN subset of `found` — alongside every raw
        // template row (`found`) used to render/edit "Weekly Hours".
        const discrete = (0, availability_service_1.generateDiscreteAvailability)(found.filter((s) => s.status === "OPEN"), appointments, from, to, cutoffMs, Date.now());
        return { slots: found, clientVisibleSlots: discrete };
    });
    res.json({ data: slots, clientVisibleSlots });
});
const createSlotSchema = zod_1.z.union([
    zod_1.z
        .object({
        dayOfWeek: zod_1.z.number().int().min(0).max(6),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        slotDurationMins: zod_1.z.number().int().min(5).optional(),
    })
        .strict(),
    zod_1.z
        .object({
        specificDate: zod_1.z.string(),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        slotDurationMins: zod_1.z.number().int().min(5).optional(),
    })
        .strict(),
]);
const createSlotsBodySchema = zod_1.z.union([createSlotSchema, zod_1.z.array(createSlotSchema)]);
// POST /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN. Supports a bulk array body ("block this week").
exports.consultantsRouter.post("/:consultantId/availability", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = createSlotsBodySchema.parse(req.body);
    const inputs = Array.isArray(body) ? body : [body];
    // Recurring (dayOfWeek) hours are the tenant admin's call — a consultant
    // may still add one-off specificDate overrides here.
    if (req.user.role === "CONSULTANT" && inputs.some((input) => "dayOfWeek" in input)) {
        throw new errorHandler_1.AppError(403, "Only a tenant admin can set recurring weekly hours", "RECURRING_SLOT_ADMIN_ONLY");
    }
    const slots = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
            // A consultant may only override hours the tenant admin's recurring
            // defaults already established — a specificDate window must fall
            // entirely inside an existing dayOfWeek slot for that date's weekday.
            const recurringSlots = await tx.availabilitySlot.findMany({
                where: { consultantId: req.params.consultantId, dayOfWeek: { not: null } },
                select: { dayOfWeek: true, startTime: true, endTime: true },
            });
            for (const input of inputs) {
                if (!("specificDate" in input))
                    continue;
                const weekday = new Date(`${input.specificDate}T00:00:00Z`).getUTCDay();
                const start = new Date(`1970-01-01T${input.startTime}:00Z`);
                const end = new Date(`1970-01-01T${input.endTime}:00Z`);
                const withinExistingHours = recurringSlots.some((slot) => slot.dayOfWeek === weekday &&
                    start.getTime() >= slot.startTime.getTime() &&
                    end.getTime() <= slot.endTime.getTime());
                if (!withinExistingHours) {
                    throw new errorHandler_1.AppError(403, "Overrides may only fall within your existing availability hours", "OVERRIDE_OUTSIDE_DEFAULT_HOURS");
                }
            }
        }
        return Promise.all(inputs.map((input) => tx.availabilitySlot.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId: req.params.consultantId,
                dayOfWeek: "dayOfWeek" in input ? input.dayOfWeek : undefined,
                specificDate: "specificDate" in input ? new Date(input.specificDate) : undefined,
                startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
                endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
                slotDurationMins: input.slotDurationMins ?? 30,
            },
        })));
    });
    res.status(201).json({ data: slots });
});
const patchSlotSchema = zod_1.z
    .object({
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
    status: zod_1.z.enum(["OPEN", "BOOKED", "BLOCKED"]).optional(),
    version: zod_1.z.number().int().min(1).optional(),
    // Required when a CONSULTANT overrides a slot the admin owns — recorded
    // to the audit log rather than a column, since AvailabilitySlot itself
    // carries no reason field.
    reason: zod_1.z.string().min(1).max(500).optional(),
})
    .strict();
// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/availability-slots/:slotId, a sibling of /consultants
// rather than nested under it — exported separately so index.ts can mount
// it at the matching path.
exports.availabilitySlotsRouter = (0, express_1.Router)({ mergeParams: true });
exports.availabilitySlotsRouter.use(require_tenant_match_1.requireTenantMatch);
// PATCH /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
exports.availabilitySlotsRouter.patch("/:slotId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = patchSlotSchema.parse(req.body);
    if (req.user.role === "CONSULTANT" && !body.reason) {
        throw new errorHandler_1.AppError(400, "A reason is required to override this slot", "OVERRIDE_REASON_REQUIRED");
    }
    const slot = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Slot not found", "SLOT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        if (body.version !== undefined && body.version !== target.version) {
            throw new errorHandler_1.AppError(409, "Slot was modified elsewhere; refresh and retry", "SLOT_VERSION_CONFLICT");
        }
        const updated = await tx.availabilitySlot.update({
            where: { id: req.params.slotId },
            data: {
                ...(body.startTime && { startTime: new Date(`1970-01-01T${body.startTime}:00Z`) }),
                ...(body.endTime && { endTime: new Date(`1970-01-01T${body.endTime}:00Z`) }),
                ...(body.status && { status: body.status }),
                version: { increment: 1 },
            },
        });
        if (req.user.role === "CONSULTANT") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "CONSULTANT",
                isCrossTenantAccess: false,
                action: "UPDATE",
                entityType: "AvailabilitySlot",
                entityId: target.id,
                reason: body.reason,
            });
        }
        return updated;
    });
    res.json({ data: slot });
});
// DELETE /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
// Blocked with 409 if BOOKED unless ?force=true.
exports.availabilitySlotsRouter.delete("/:slotId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const force = req.query.force === "true";
    const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
    if (req.user.role === "CONSULTANT" && !reason) {
        throw new errorHandler_1.AppError(400, "A reason is required to override this slot", "OVERRIDE_REASON_REQUIRED");
    }
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Slot not found", "SLOT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        if (target.status === "BOOKED" && !force) {
            throw new errorHandler_1.AppError(409, "Slot is booked; pass ?force=true to override", "SLOT_BOOKED");
        }
        await tx.availabilitySlot.delete({ where: { id: req.params.slotId } });
        if (req.user.role === "CONSULTANT") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "CONSULTANT",
                isCrossTenantAccess: false,
                action: "DELETE",
                entityType: "AvailabilitySlot",
                entityId: target.id,
                reason,
            });
        }
    });
    res.status(204).send();
});
// GET /tenants/:tenantId/consultants/:consultantId/out-of-office
exports.consultantsRouter.get("/:consultantId/out-of-office", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const periods = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.outOfOfficePeriod.findMany({ where: { consultantId: req.params.consultantId } });
    });
    res.json({ data: periods });
});
const createOooSchema = zod_1.z
    .object({
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    autoReplyMessage: zod_1.z.string().optional(),
    pausesNewBookings: zod_1.z.boolean().optional(),
})
    .strict();
// POST /tenants/:tenantId/consultants/:consultantId/out-of-office
exports.consultantsRouter.post("/:consultantId/out-of-office", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = createOooSchema.parse(req.body);
    const period = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.outOfOfficePeriod.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId: req.params.consultantId,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                autoReplyMessage: body.autoReplyMessage,
                ...(body.pausesNewBookings !== undefined && {
                    pausesNewBookings: body.pausesNewBookings,
                }),
            },
        });
    });
    res.status(201).json({ data: period });
});
const patchOooSchema = zod_1.z
    .object({
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    autoReplyMessage: zod_1.z.string().optional(),
    pausesNewBookings: zod_1.z.boolean().optional(),
})
    .strict();
async function findOoo(tx, tenantId, oooId) {
    const period = await tx.outOfOfficePeriod.findUnique({ where: { id: oooId } });
    if (!period || period.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Out-of-office period not found", "OOO_NOT_FOUND");
    }
    return period;
}
// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/out-of-office/:oooId, a sibling of /consultants rather
// than nested under it — exported separately so index.ts can mount it at
// the matching path.
exports.outOfOfficeRouter = (0, express_1.Router)({ mergeParams: true });
exports.outOfOfficeRouter.use(require_tenant_match_1.requireTenantMatch);
// PATCH /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
exports.outOfOfficeRouter.patch("/:oooId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = patchOooSchema.parse(req.body);
    const period = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        return tx.outOfOfficePeriod.update({
            where: { id: req.params.oooId },
            data: {
                ...(body.startDate && { startDate: new Date(body.startDate) }),
                ...(body.endDate && { endDate: new Date(body.endDate) }),
                ...(body.autoReplyMessage !== undefined && { autoReplyMessage: body.autoReplyMessage }),
                ...(body.pausesNewBookings !== undefined && {
                    pausesNewBookings: body.pausesNewBookings,
                }),
            },
        });
    });
    res.json({ data: period });
});
// DELETE /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
exports.outOfOfficeRouter.delete("/:oooId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        await tx.outOfOfficePeriod.delete({ where: { id: req.params.oooId } });
    });
    res.status(204).send();
});
const availabilityDefaultSchema = zod_1.z
    .object({
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    slotDurationMins: zod_1.z.number().int().min(5).optional(),
})
    .strict();
const setAvailabilityDefaultsBodySchema = zod_1.z.array(availabilityDefaultSchema);
// A sibling of /consultants (same reasoning as availabilitySlotsRouter and
// outOfOfficeRouter above) mounted at /tenants/:tenantId/availability-defaults.
exports.availabilityDefaultsRouter = (0, express_1.Router)({ mergeParams: true });
exports.availabilityDefaultsRouter.use(require_tenant_match_1.requireTenantMatch);
// GET /tenants/:tenantId/availability-defaults — TENANT_ADMIN, SUPER_ADMIN.
// Returns the tenant's current recurring weekly window so Settings can
// hydrate its form instead of falling back to hardcoded defaults.
exports.availabilityDefaultsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const defaults = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.tenantAvailabilityDefault.findMany({ where: { tenantId: req.params.tenantId } }));
    res.json({
        data: defaults.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime.toISOString().slice(11, 16),
            endTime: d.endTime.toISOString().slice(11, 16),
            slotDurationMins: d.slotDurationMins,
        })),
    });
});
// PUT /tenants/:tenantId/availability-defaults — TENANT_ADMIN, SUPER_ADMIN.
// Replaces the tenant's recurring weekly window ("Weekly Recurring Time" in
// Settings) and applies it to every consultant currently in the tenant,
// skipping any consultant who already has a matching slot. Consultants
// onboarded afterward get it automatically via applyTenantAvailabilityDefaults
// in the consultant-creation/approval routes, so admins never need to
// replay this beyond backfilling consultants who joined before this existed.
exports.availabilityDefaultsRouter.put("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = setAvailabilityDefaultsBodySchema.parse(req.body);
    const defaults = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await tx.tenantAvailabilityDefault.deleteMany({ where: { tenantId: req.params.tenantId } });
        const created = await Promise.all(body.map((input) => tx.tenantAvailabilityDefault.create({
            data: {
                tenantId: req.params.tenantId,
                dayOfWeek: input.dayOfWeek,
                // Append Z so the string is parsed as UTC, matching how Prisma
                // returns @db.Time columns (always UTC midnight + offset).
                startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
                endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
                // Use explicit assignment (not truthy shorthand) so the value is
                // always written to the DB, enabling exact comparison in
                // applyTenantAvailabilityDefaults.
                slotDurationMins: input.slotDurationMins ?? 30,
            },
        })));
        const consultants = await tx.consultantProfile.findMany({
            where: { tenantId: req.params.tenantId },
            select: { id: true },
        });
        for (const consultant of consultants) {
            await (0, availability_service_1.applyTenantAvailabilityDefaults)(tx, req.params.tenantId, consultant.id);
        }
        return created;
    });
    res.json({ data: defaults });
});
//# sourceMappingURL=consultants.router.js.map