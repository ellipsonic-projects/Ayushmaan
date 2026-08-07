"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrReuseCase = createOrReuseCase;
exports.assertGuardianConsentIfMinor = assertGuardianConsentIfMinor;
exports.assertNoConflict = assertNoConflict;
exports.assertNoOutOfOfficeConflict = assertNoOutOfOfficeConflict;
exports.assertNoSameDayAppointmentWithConsultant = assertNoSameDayAppointmentWithConsultant;
exports.assertWithinCancellationCutoff = assertWithinCancellationCutoff;
exports.expandOccurrences = expandOccurrences;
const errorHandler_1 = require("../middleware/errorHandler");
// instructions.md §1 — extracted from cases.router.ts's POST / handler so
// both that route and the consultant-initiated appointment endpoint
// (POST /consultants/:consultantId/appointments) dedupe onto an existing
// open case the same way: picking an existing client with no explicit
// matterKey reuses the most recent open case in that category rather than
// opening a duplicate. An explicit matterKey always means "new concurrent
// matter" (schema.prisma Case.matterKey), so it's never deduped.
async function createOrReuseCase(tx, params) {
    if ((params.dedupe ?? true) && !params.matterKey) {
        const existing = await tx.case.findFirst({
            where: {
                tenantId: params.tenantId,
                clientId: params.clientId,
                consultantId: params.consultantId,
                category: params.category,
                matterKey: null,
                status: { not: "CLOSED" },
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
        if (existing) {
            const updated = await tx.case.update({
                where: { id: existing.id },
                data: {
                    requirementsSubject: existing.requirementsSubject || params.requirementsSubject,
                    ...(params.requirements && {
                        requirements: existing.requirements
                            ? `${existing.requirements}\n\n${params.requirements}`
                            : params.requirements,
                    }),
                },
            });
            return { case: updated, isNew: false };
        }
    }
    const created = await tx.case.create({
        data: {
            tenantId: params.tenantId,
            clientId: params.clientId,
            consultantId: params.consultantId,
            category: params.category,
            matterKey: params.matterKey,
            requirementsSubject: params.requirementsSubject,
            requirements: params.requirements,
        },
    });
    await tx.caseConsultantAssignment.create({
        data: {
            tenantId: params.tenantId,
            caseId: created.id,
            consultantId: params.consultantId,
            startedAt: created.createdAt,
        },
    });
    return { case: created, isNew: true };
}
// schema_ayushman_v3.md §3.7 — bookings for a minor client_id are blocked
// until a guardian_links row for them carries a non-null consent_given_at.
// "Minor" here mirrors client_profiles.dob's documented age math (client is
// still under 18) since the schema has no stored generated is_minor column.
async function assertGuardianConsentIfMinor(tx, clientId) {
    const client = await tx.clientProfile.findUnique({
        where: { id: clientId },
        select: { dob: true },
    });
    if (!client?.dob)
        return;
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    if (client.dob <= eighteenYearsAgo)
        return; // 18 or older
    const consented = await tx.guardianLink.findFirst({
        where: { minorClientId: clientId, consentGivenAt: { not: null } },
    });
    if (!consented) {
        throw new errorHandler_1.AppError(403, "Booking is blocked until a guardian has given consent for this minor client", "GUARDIAN_CONSENT_REQUIRED");
    }
}
// 409 on double-book (data_api_v4.md §11). A full slot-instance model (one
// row per bookable occurrence, expanded from a recurring AvailabilitySlot
// template) is a larger scheduling-engine feature than this booking-loop
// pass covers — this checks the thing that actually prevents a double-book:
// no two non-cancelled Appointments overlapping for the same consultant.
async function assertNoConflict(tx, params) {
    const conflict = await tx.appointment.findFirst({
        where: {
            id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
            status: { notIn: ["CANCELLED"] },
            scheduledStart: { lt: params.scheduledEnd },
            scheduledEnd: { gt: params.scheduledStart },
            case: { consultantId: params.consultantId },
        },
    });
    if (conflict) {
        throw new errorHandler_1.AppError(409, "This slot conflicts with an existing appointment", "SLOT_CONFLICT");
    }
}
// Sprint 3.3 — reject a booking attempt for a slot inside an active
// out_of_office_periods window with pauses_new_bookings = true. Date-only
// comparison since OutOfOfficePeriod.startDate/endDate are @db.Date columns.
async function assertNoOutOfOfficeConflict(tx, params) {
    const bookingDate = new Date(params.scheduledStart.toISOString().slice(0, 10));
    const period = await tx.outOfOfficePeriod.findFirst({
        where: {
            consultantId: params.consultantId,
            pausesNewBookings: true,
            startDate: { lte: bookingDate },
            endDate: { gte: bookingDate },
        },
    });
    if (period) {
        throw new errorHandler_1.AppError(409, period.autoReplyMessage ?? "This consultant is out of office for the selected date", "CONSULTANT_OUT_OF_OFFICE");
    }
}
// Blocks a second booking with the same consultant on a day the client
// already has a pending/approved one with them — distinct from
// assertNoConflict's time-overlap guard, which only protects the
// consultant's calendar against double-booking, not a client stacking
// same-day requests with the same consultant.
async function assertNoSameDayAppointmentWithConsultant(tx, params) {
    const dayStart = new Date(params.scheduledStart);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const existing = await tx.appointment.findFirst({
        where: {
            status: { in: ["REQUESTED", "ADMIN_APPROVED", "APPROVED"] },
            scheduledStart: { gte: dayStart, lt: dayEnd },
            case: { clientId: params.clientId, consultantId: params.consultantId },
        },
    });
    if (existing) {
        throw new errorHandler_1.AppError(409, "You already have an appointment with this consultant on this day", "SAME_DAY_APPOINTMENT_EXISTS");
    }
}
// Sprint 3.4 — a CLIENT may only cancel within tenant_settings.booking_cutoff_hours
// of the scheduled start; TENANT_ADMIN/CONSULTANT cancellations aren't gated by this.
async function assertWithinCancellationCutoff(tx, params) {
    const settings = await tx.tenantSettings.findUnique({
        where: { tenantId: params.tenantId },
        select: { bookingCutoffHours: true },
    });
    const cutoffMs = (settings?.bookingCutoffHours ?? 2) * 60 * 60 * 1000;
    if (params.scheduledStart.getTime() - Date.now() < cutoffMs) {
        throw new errorHandler_1.AppError(409, "This appointment can no longer be cancelled — it is inside the booking cutoff window", "CANCELLATION_CUTOFF");
    }
}
// Expands a recurrence rule into concrete occurrence datetimes. Simple
// calendar-day walk — no DST-aware slot math yet (PRD_v3 §5 Phase 3 calls
// that out as its own follow-up UI concern).
function expandOccurrences(rule) {
    const [hours, minutes] = rule.startTime.split(":").map(Number);
    const occurrences = [];
    const cursor = new Date(rule.startDate);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getDay() !== rule.dayOfWeek) {
        cursor.setDate(cursor.getDate() + 1);
    }
    const end = rule.endDate ? new Date(rule.endDate) : null;
    const maxOccurrences = rule.occurrenceCount ?? (end ? Infinity : 1);
    while (occurrences.length < maxOccurrences) {
        if (end && cursor > end)
            break;
        const start = new Date(cursor);
        start.setHours(hours, minutes, 0, 0);
        const occurrenceEnd = new Date(start.getTime() + rule.durationMins * 60000);
        occurrences.push({ start, end: occurrenceEnd });
        cursor.setDate(cursor.getDate() + 7);
        if (!end && !rule.occurrenceCount)
            break; // a single occurrence with neither bound given
    }
    return occurrences;
}
//# sourceMappingURL=booking.service.js.map