"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsRouter = exports.appointmentSeriesRouter = exports.caseAppointmentSeriesRouter = exports.caseAppointmentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const booking_service_1 = require("../services/booking.service");
const audit_service_1 = require("../services/audit.service");
const workflow_context_1 = require("../lib/workflow-context");
const workflow_events_1 = require("../lib/workflow-events");
const notification_service_1 = require("../services/notification.service");
// data_api_v4.md §11 — appointment_series, appointments. Two-stage approval:
// REQUESTED -> (TENANT_ADMIN) ADMIN_APPROVED/RESCHEDULE_PROPOSED/CANCELLED
// -> (CONSULTANT) APPROVED -> COMPLETED/CANCELLED/NO_SHOW. Only TENANT_ADMIN
// can ever cancel/reject; a CONSULTANT who doesn't want an ADMIN_APPROVED
// appointment transfers the case to a peer via POST /cases/:caseId/reassign
// instead of rejecting it.
// Shared between the list (GET /) and single-appointment (GET /:appointmentId)
// reads so both return the same case shape — clientId/consultantId scalars
// are kept alongside the nested client/consultant relations since
// assertCaseParty needs the raw ids, not just the display fields.
const caseSummarySelect = {
    id: true,
    status: true,
    category: true,
    requirementsSubject: true,
    requirements: true,
    clientId: true,
    consultantId: true,
    client: { select: { id: true, fullName: true } },
    consultant: {
        select: {
            id: true,
            fullName: true,
            category: true,
            consultationFee: true,
            currency: true,
        },
    },
    documents: {
        where: { deletedAt: null },
        select: { id: true, fileName: true, isClientVisible: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    },
};
async function loadCaseForBooking(tx, tenantId, caseId) {
    const found = await tx.case.findUnique({ where: { id: caseId } });
    if (!found || found.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    return found;
}
async function assertCaseParty(tx, req, caseRow) {
    if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") {
        return; // tenant-scoped via requireTenantMatch + RLS, not tied to case ownership.
    }
    if (req.user.role === "CONSULTANT") {
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (consultantId !== caseRow.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        return;
    }
    if (req.user.role === "CLIENT") {
        const accessible = await (0, callerProfile_1.isClientProfileAccessibleToUser)(tx, req.user.id, caseRow.clientId);
        if (!accessible)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        return;
    }
    throw new errorHandler_1.AppError(403, "Forbidden", "ROLE_FORBIDDEN");
}
async function resolveAutoApprove(tx, tenantId, consultantId) {
    const [consultant, settings] = await Promise.all([
        tx.consultantProfile.findUnique({
            where: { id: consultantId },
            select: { autoApproveBookings: true },
        }),
        tx.tenantSettings.findUnique({ where: { tenantId }, select: { autoApproveBookings: true } }),
    ]);
    return consultant?.autoApproveBookings || settings?.autoApproveBookings || false;
}
// Sprint 3.4 — a REQUESTED appointment that no TENANT_ADMIN acts on within
// tenant_settings.request_expiry_hours auto-expires (apps/api/src/cron/expire-requests.ts).
async function resolveRequestExpiresAt(tx, tenantId) {
    const settings = await tx.tenantSettings.findUnique({
        where: { tenantId },
        select: { requestExpiryHours: true },
    });
    const hours = settings?.requestExpiryHours ?? 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}
// Mounted at /api/tenants/:tenantId/cases/:caseId/appointments.
exports.caseAppointmentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseAppointmentsRouter.use(require_tenant_match_1.requireTenantMatch);
// GET /tenants/:tenantId/cases/:caseId/appointments
exports.caseAppointmentsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    const appointments = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
        await assertCaseParty(tx, req, caseRow);
        return tx.appointment.findMany({
            where: { caseId: req.params.caseId },
            orderBy: { scheduledStart: "desc" },
        });
    });
    res.json({ data: appointments });
});
const createAppointmentSchema = zod_1.z
    .object({
    scheduledStart: zod_1.z.string(),
    scheduledEnd: zod_1.z.string(),
    meetingLink: zod_1.z.string().url().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/appointments — single-occurrence
// booking. Conflict-checked against existing appointments; 409 on double-book.
// TENANT_ADMIN may book directly on a client's behalf against an existing
// case — that appointment starts ADMIN_APPROVED (the admin creating it IS
// the admin-review stage) instead of REQUESTED, and is audit-logged.
exports.caseAppointmentsRouter.post("/", (0, require_role_1.requireRole)("CLIENT", "CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = createAppointmentSchema.parse(req.body);
    const scheduledStart = new Date(body.scheduledStart);
    const scheduledEnd = new Date(body.scheduledEnd);
    const appointment = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
        if (!caseRow.consultantId) {
            throw new errorHandler_1.AppError(409, "This case has no consultant assigned yet", "CASE_PENDING_ASSIGNMENT");
        }
        const consultantId = caseRow.consultantId;
        await assertCaseParty(tx, req, caseRow);
        await (0, booking_service_1.assertGuardianConsentIfMinor)(tx, caseRow.clientId);
        await (0, booking_service_1.assertNoConflict)(tx, {
            consultantId,
            scheduledStart,
            scheduledEnd,
        });
        await (0, booking_service_1.assertNoOutOfOfficeConflict)(tx, { consultantId, scheduledStart });
        await (0, booking_service_1.assertNoSameDayAppointmentWithConsultant)(tx, {
            clientId: caseRow.clientId,
            consultantId,
            scheduledStart,
        });
        const autoApprove = await resolveAutoApprove(tx, req.params.tenantId, consultantId);
        const isAdminCreated = req.user.role === "TENANT_ADMIN";
        // A CONSULTANT booking their own case IS the confirmation — same policy
        // as POST /consultants/:consultantId/appointments (instructions.md §1)
        // — so this path also skips straight to APPROVED instead of REQUESTED,
        // rather than leaving the same actor's booking pending review only
        // because they used this route instead of that one.
        const isConsultantCreated = req.user.role === "CONSULTANT";
        const status = autoApprove || isConsultantCreated
            ? "APPROVED"
            : isAdminCreated
                ? "ADMIN_APPROVED"
                : "REQUESTED";
        const created = await tx.appointment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: req.params.caseId,
                scheduledStart,
                scheduledEnd,
                meetingLink: body.meetingLink,
                status,
                requestExpiresAt: status === "REQUESTED" ? await resolveRequestExpiresAt(tx, req.params.tenantId) : null,
            },
        });
        if (isAdminCreated) {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "TENANT_ADMIN",
                isCrossTenantAccess: false,
                action: "CREATE_APPOINTMENT",
                entityType: "appointment",
                entityId: created.id,
            });
        }
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_BOOKED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, req.params.caseId)),
            appointment: {
                id: created.id,
                scheduledStart: created.scheduledStart.toISOString(),
                scheduledEnd: created.scheduledEnd.toISOString(),
                status: created.status,
            },
        });
        return created;
    });
    res.status(201).json({ data: appointment });
});
const createSeriesSchema = zod_1.z
    .object({
    recurrenceRule: zod_1.z.object({
        dayOfWeek: zod_1.z.number().int().min(0).max(6),
        startTime: zod_1.z.string(),
        durationMins: zod_1.z.number().int().min(5),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string().optional(),
        occurrenceCount: zod_1.z.number().int().min(1).optional(),
    }),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/appointment-series — recurring
// booking. Creates appointment_series + expands appointments atomically.
// data_api_v4.md's path for series creation is a sibling of /appointments
// under the same /cases/:caseId parent — exported separately since it
// can't share caseAppointmentsRouter's own base path.
exports.caseAppointmentSeriesRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseAppointmentSeriesRouter.use(require_tenant_match_1.requireTenantMatch);
exports.caseAppointmentSeriesRouter.post("/", (0, require_role_1.requireRole)("CLIENT", "CONSULTANT"), async (req, res) => {
    const body = createSeriesSchema.parse(req.body);
    const rule = body.recurrenceRule;
    const occurrences = (0, booking_service_1.expandOccurrences)(rule);
    if (occurrences.length === 0) {
        throw new errorHandler_1.AppError(400, "recurrenceRule produced no occurrences", "EMPTY_SERIES");
    }
    const series = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
        if (!caseRow.consultantId) {
            throw new errorHandler_1.AppError(409, "This case has no consultant assigned yet", "CASE_PENDING_ASSIGNMENT");
        }
        const consultantId = caseRow.consultantId;
        await assertCaseParty(tx, req, caseRow);
        await (0, booking_service_1.assertGuardianConsentIfMinor)(tx, caseRow.clientId);
        for (const occ of occurrences) {
            await (0, booking_service_1.assertNoConflict)(tx, {
                consultantId,
                scheduledStart: occ.start,
                scheduledEnd: occ.end,
            });
            await (0, booking_service_1.assertNoOutOfOfficeConflict)(tx, { consultantId, scheduledStart: occ.start });
            await (0, booking_service_1.assertNoSameDayAppointmentWithConsultant)(tx, {
                clientId: caseRow.clientId,
                consultantId,
                scheduledStart: occ.start,
            });
        }
        const autoApprove = await resolveAutoApprove(tx, req.params.tenantId, consultantId);
        const status = autoApprove ? "APPROVED" : "REQUESTED";
        const requestExpiresAt = status === "REQUESTED" ? await resolveRequestExpiresAt(tx, req.params.tenantId) : null;
        const created = await tx.appointmentSeries.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: req.params.caseId,
                recurrenceRule: rule,
                appointments: {
                    create: occurrences.map((occ) => ({
                        tenantId: req.params.tenantId,
                        caseId: req.params.caseId,
                        scheduledStart: occ.start,
                        scheduledEnd: occ.end,
                        status,
                        requestExpiresAt,
                    })),
                },
            },
            include: { appointments: true },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_SERIES_BOOKED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, req.params.caseId)),
            series: { id: created.id, occurrenceCount: created.appointments.length },
        });
        return created;
    });
    res.status(201).json({ data: series });
});
// Mounted at /api/tenants/:tenantId/appointment-series.
exports.appointmentSeriesRouter = (0, express_1.Router)({ mergeParams: true });
exports.appointmentSeriesRouter.use(require_tenant_match_1.requireTenantMatch);
async function loadSeries(tx, tenantId, seriesId) {
    const found = await tx.appointmentSeries.findUnique({
        where: { id: seriesId },
        include: { case: true, appointments: true },
    });
    if (!found || found.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Appointment series not found", "SERIES_NOT_FOUND");
    }
    return found;
}
// GET /tenants/:tenantId/appointment-series/:seriesId
exports.appointmentSeriesRouter.get("/:seriesId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    const series = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await loadSeries(tx, req.params.tenantId, req.params.seriesId);
        await assertCaseParty(tx, req, found.case);
        return found;
    });
    res.json({ data: series });
});
const patchSeriesSchema = zod_1.z
    .object({
    status: zod_1.z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
})
    .strict();
// PATCH /tenants/:tenantId/appointment-series/:seriesId — CONSULTANT (own).
// Cancelling cascades only to future REQUESTED/APPROVED occurrences.
exports.appointmentSeriesRouter.patch("/:seriesId", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = patchSeriesSchema.parse(req.body);
    const series = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await loadSeries(tx, req.params.tenantId, req.params.seriesId);
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (consultantId !== found.case.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        const updated = await tx.appointmentSeries.update({
            where: { id: req.params.seriesId },
            data: { status: body.status },
        });
        if (body.status === "CANCELLED") {
            await tx.appointment.updateMany({
                where: {
                    seriesId: req.params.seriesId,
                    scheduledStart: { gt: new Date() },
                    status: { in: ["REQUESTED", "APPROVED"] },
                },
                data: { status: "CANCELLED" },
            });
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_SERIES_CANCELLED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, found.caseId)),
                series: { id: updated.id },
            });
        }
        return updated;
    });
    res.json({ data: series });
});
// POST /tenants/:tenantId/appointment-series/:seriesId/approve — Sprint 3.4
// item 3: admin-approve or consultant-accept every open occurrence of a
// series in one action instead of per-occurrence, following the same
// two-stage gate as a single appointment (REQUESTED -> ADMIN_APPROVED for
// TENANT_ADMIN, ADMIN_APPROVED -> APPROVED for the owning CONSULTANT).
// Validates every occurrence before applying any update, so a single
// conflicting occurrence fails the whole batch rather than partially
// approving a series.
exports.appointmentSeriesRouter.post("/:seriesId/approve", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"), async (req, res) => {
    const isAdmin = req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN";
    const fromStatus = isAdmin ? "REQUESTED" : "ADMIN_APPROVED";
    const toStatus = isAdmin ? "ADMIN_APPROVED" : "APPROVED";
    const updatedCount = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await loadSeries(tx, req.params.tenantId, req.params.seriesId);
        if (!isAdmin) {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (consultantId !== found.case.consultantId)
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
        const targets = found.appointments.filter((a) => a.status === fromStatus);
        if (targets.length === 0) {
            throw new errorHandler_1.AppError(422, `No occurrences in this series are ${fromStatus}`, "ILLEGAL_TRANSITION");
        }
        if (toStatus === "ADMIN_APPROVED" && found.case.consultantId) {
            for (const occ of targets) {
                await (0, booking_service_1.assertNoConflict)(tx, {
                    consultantId: found.case.consultantId,
                    scheduledStart: occ.scheduledStart,
                    scheduledEnd: occ.scheduledEnd,
                    excludeAppointmentId: occ.id,
                });
                await (0, booking_service_1.assertNoOutOfOfficeConflict)(tx, {
                    consultantId: found.case.consultantId,
                    scheduledStart: occ.scheduledStart,
                });
            }
        }
        const { count } = await tx.appointment.updateMany({
            where: { id: { in: targets.map((occ) => occ.id) } },
            data: { status: toStatus },
        });
        if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: req.user.role,
                isCrossTenantAccess: req.user.role === "SUPER_ADMIN",
                action: "APPROVE_APPOINTMENT",
                entityType: "appointment_series",
                entityId: found.id,
            });
        }
        if (isAdmin && toStatus === "ADMIN_APPROVED" && found.case.consultantId) {
            const consultant = await tx.consultantProfile.findUnique({
                where: { id: found.case.consultantId },
                select: { userId: true },
            });
            if (consultant) {
                await (0, notification_service_1.dispatch)(tx, {
                    tenantId: req.params.tenantId,
                    userId: consultant.userId,
                    type: "APPOINTMENT_ADMIN_APPROVED",
                    message: {
                        subject: "Appointment series approved",
                        body: "A Tenant Admin approved your recurring appointment request. Please confirm it.",
                    },
                    payload: { appointmentSeriesId: found.id },
                });
            }
        }
        return count;
    });
    res.json({ data: { updatedCount } });
});
// Mounted at /api/tenants/:tenantId/appointments.
exports.appointmentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.appointmentsRouter.use(require_tenant_match_1.requireTenantMatch);
const listAppointmentsQuerySchema = zod_1.z.object({
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    status: zod_1.z
        .enum([
        "REQUESTED",
        "ADMIN_APPROVED",
        "APPROVED",
        "RESCHEDULE_PROPOSED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
    ])
        .optional(),
});
// GET /tenants/:tenantId/appointments — tenant-wide list, TENANT_ADMIN (all)
// or CONSULTANT (own only, scoped via case.consultantId below). CLIENT still
// uses the per-case route instead. Not in data_api_v4.md §11 yet — added to
// back the admin dashboard's "today's appointments", "pending approvals" and
// revenue KPIs, which had no tenant-scoped read path before this; widened to
// CONSULTANT for the same reason on the consultant dashboard.
exports.appointmentsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"), async (req, res) => {
    const query = listAppointmentsQuerySchema.parse(req.query);
    const appointments = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        let consultantId;
        if (req.user.role === "CONSULTANT") {
            consultantId = (await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id)) ?? undefined;
            if (!consultantId)
                return [];
        }
        return tx.appointment.findMany({
            where: {
                tenantId: req.params.tenantId,
                ...(query.status && { status: query.status }),
                ...((query.from || query.to) && {
                    scheduledStart: {
                        ...(query.from && { gte: new Date(query.from) }),
                        ...(query.to && { lte: new Date(query.to) }),
                    },
                }),
                ...(consultantId && { case: { consultantId } }),
            },
            include: {
                case: {
                    select: caseSummarySelect,
                },
                payments: { select: { amount: true, status: true, createdAt: true } },
            },
            orderBy: { scheduledStart: "asc" },
        });
    });
    res.json({ data: appointments });
});
async function loadAppointment(tx, tenantId, appointmentId) {
    const found = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
            case: { select: caseSummarySelect },
            payments: { select: { amount: true, status: true, createdAt: true } },
        },
    });
    if (!found || found.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
    }
    return found;
}
// GET /tenants/:tenantId/appointments/:appointmentId
exports.appointmentsRouter.get("/:appointmentId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const appointment = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await loadAppointment(tx, req.params.tenantId, req.params.appointmentId);
        await assertCaseParty(tx, req, found.case);
        return found;
    });
    res.json({ data: appointment });
});
// data_api_v4.md §11 — legal transitions per role AND current status. Only
// TENANT_ADMIN can ever reject/cancel; a CONSULTANT who doesn't want an
// ADMIN_APPROVED appointment transfers the case to a peer consultant via
// POST /cases/:caseId/reassign instead — there is no CONSULTANT->CANCELLED
// path here. COMPLETED/CANCELLED/NO_SHOW are terminal; an illegal
// transition (wrong status, wrong role, or both) is 422.
const TRANSITIONS_BY_ROLE = {
    TENANT_ADMIN: {
        REQUESTED: ["ADMIN_APPROVED", "RESCHEDULE_PROPOSED", "CANCELLED"],
        ADMIN_APPROVED: ["CANCELLED"],
        RESCHEDULE_PROPOSED: ["CANCELLED"],
        APPROVED: ["CANCELLED"],
    },
    SUPER_ADMIN: {
        REQUESTED: ["ADMIN_APPROVED", "RESCHEDULE_PROPOSED", "CANCELLED"],
        ADMIN_APPROVED: ["CANCELLED"],
        RESCHEDULE_PROPOSED: ["CANCELLED"],
        APPROVED: ["CANCELLED"],
    },
    CONSULTANT: {
        ADMIN_APPROVED: ["APPROVED"],
        APPROVED: ["COMPLETED", "NO_SHOW"],
    },
    CLIENT: {
        RESCHEDULE_PROPOSED: ["ADMIN_APPROVED", "CANCELLED"],
        REQUESTED: ["CANCELLED"],
        APPROVED: ["CANCELLED"],
    },
};
const ADMIN_ACTION_BY_TARGET_STATUS = {
    ADMIN_APPROVED: "APPROVE_APPOINTMENT",
    RESCHEDULE_PROPOSED: "PROPOSE_RESCHEDULE",
    CANCELLED: "REJECT_APPOINTMENT",
};
const patchAppointmentSchema = zod_1.z
    .object({
    status: zod_1.z
        .enum([
        "REQUESTED",
        "ADMIN_APPROVED",
        "APPROVED",
        "RESCHEDULE_PROPOSED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
    ])
        .optional(),
    meetingLink: zod_1.z.string().url().optional(),
    cancellationReason: zod_1.z.string().optional(),
    scheduledStart: zod_1.z.string().optional(),
    scheduledEnd: zod_1.z.string().optional(),
})
    .strict();
// PATCH /tenants/:tenantId/appointments/:appointmentId — appointment
// state-machine transitions. TENANT_ADMIN: admin-approve/propose-reschedule/
// reject a REQUESTED appointment, or cancel at any later stage — the only
// role that can ever cancel/reject. CONSULTANT: accept an ADMIN_APPROVED
// appointment, mark complete/no-show/videoLink on an APPROVED one. CLIENT:
// accept/decline a Tenant-Admin-proposed reschedule, cancel within cutoff —
// never videoLink or NO_SHOW.
exports.appointmentsRouter.patch("/:appointmentId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = patchAppointmentSchema.parse(req.body);
    if (req.user.role === "CLIENT" && (body.meetingLink || body.status === "NO_SHOW")) {
        throw new errorHandler_1.AppError(403, "A Client cannot set videoLink or mark NO_SHOW", "ROLE_FORBIDDEN");
    }
    // Direct prepone/postpone of scheduledStart/scheduledEnd (as opposed to
    // the admin propose-reschedule status flow) is a CONSULTANT preference
    // per data_api_v4.md §11's series note — a Client already has its own
    // accept/decline path via RESCHEDULE_PROPOSED.
    if (req.user.role === "CLIENT" &&
        (body.scheduledStart !== undefined || body.scheduledEnd !== undefined)) {
        throw new errorHandler_1.AppError(403, "A Client cannot directly change the appointment time", "ROLE_FORBIDDEN");
    }
    const appointment = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await loadAppointment(tx, req.params.tenantId, req.params.appointmentId);
        await assertCaseParty(tx, req, found.case);
        if (body.status) {
            const allowed = TRANSITIONS_BY_ROLE[req.user.role]?.[found.status] ?? [];
            if (!allowed.includes(body.status)) {
                throw new errorHandler_1.AppError(422, `Cannot transition an appointment from ${found.status} to ${body.status}`, "ILLEGAL_TRANSITION");
            }
            // Sprint 3.4 — re-check the consultant's availability at the admin-
            // approve step, since time has passed since the client's original
            // REQUESTED booking (another appointment or an OOO period may have
            // since been created for the same slot).
            if (body.status === "ADMIN_APPROVED" && found.case.consultantId) {
                await (0, booking_service_1.assertNoConflict)(tx, {
                    consultantId: found.case.consultantId,
                    scheduledStart: found.scheduledStart,
                    scheduledEnd: found.scheduledEnd,
                    excludeAppointmentId: found.id,
                });
                await (0, booking_service_1.assertNoOutOfOfficeConflict)(tx, {
                    consultantId: found.case.consultantId,
                    scheduledStart: found.scheduledStart,
                });
            }
            if (body.status === "CANCELLED" && req.user.role === "CLIENT") {
                await (0, booking_service_1.assertWithinCancellationCutoff)(tx, {
                    tenantId: req.params.tenantId,
                    scheduledStart: found.scheduledStart,
                });
            }
        }
        if ((body.scheduledStart || body.scheduledEnd) && found.case.consultantId) {
            await (0, booking_service_1.assertNoConflict)(tx, {
                consultantId: found.case.consultantId,
                scheduledStart: body.scheduledStart
                    ? new Date(body.scheduledStart)
                    : found.scheduledStart,
                scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : found.scheduledEnd,
                excludeAppointmentId: found.id,
            });
        }
        const updated = await tx.appointment.update({
            where: { id: req.params.appointmentId },
            data: {
                ...(body.status && { status: body.status }),
                ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink }),
                ...(body.cancellationReason !== undefined && {
                    cancellationReason: body.cancellationReason,
                }),
                ...(body.scheduledStart && { scheduledStart: new Date(body.scheduledStart) }),
                ...(body.scheduledEnd && { scheduledEnd: new Date(body.scheduledEnd) }),
            },
        });
        if ((req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") && body.status) {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: req.user.role,
                isCrossTenantAccess: req.user.role === "SUPER_ADMIN",
                action: ADMIN_ACTION_BY_TARGET_STATUS[body.status] ?? "UPDATE_APPOINTMENT",
                entityType: "appointment",
                entityId: updated.id,
                reason: body.cancellationReason,
            });
        }
        if (body.status === "ADMIN_APPROVED" &&
            (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") &&
            found.case.consultantId) {
            const consultant = await tx.consultantProfile.findUnique({
                where: { id: found.case.consultantId },
                select: { userId: true },
            });
            if (consultant) {
                await (0, notification_service_1.dispatch)(tx, {
                    tenantId: req.params.tenantId,
                    userId: consultant.userId,
                    type: "APPOINTMENT_ADMIN_APPROVED",
                    message: {
                        subject: "Appointment approved",
                        body: "A Tenant Admin approved your appointment request. Please confirm it.",
                    },
                    payload: { appointmentId: updated.id },
                });
            }
        }
        if (body.status === "CANCELLED") {
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_CANCELLED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, found.caseId)),
                appointment: {
                    id: updated.id,
                    scheduledStart: updated.scheduledStart.toISOString(),
                    scheduledEnd: updated.scheduledEnd.toISOString(),
                    status: updated.status,
                    cancellationReason: updated.cancellationReason,
                },
            });
        }
        if (body.status === "COMPLETED") {
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_COMPLETED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, found.caseId)),
                appointment: {
                    id: updated.id,
                    scheduledStart: updated.scheduledStart.toISOString(),
                    scheduledEnd: updated.scheduledEnd.toISOString(),
                },
            });
        }
        // Either a direct consultant prepone/postpone, or a client accepting a
        // TENANT_ADMIN-proposed reschedule (RESCHEDULE_PROPOSED -> ADMIN_APPROVED).
        const isDirectReschedule = body.scheduledStart !== undefined || body.scheduledEnd !== undefined;
        const isAcceptedReschedule = body.status === "ADMIN_APPROVED" && found.status === "RESCHEDULE_PROPOSED";
        if (isDirectReschedule || isAcceptedReschedule) {
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_RESCHEDULED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, found.caseId)),
                appointment: {
                    id: updated.id,
                    scheduledStart: updated.scheduledStart.toISOString(),
                    scheduledEnd: updated.scheduledEnd.toISOString(),
                },
            });
        }
        return updated;
    });
    res.json({ data: appointment });
});
//# sourceMappingURL=appointments.router.js.map