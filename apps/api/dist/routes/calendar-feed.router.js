"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarFeedRouter = void 0;
const express_1 = require("express");
const rls_context_1 = require("@ayushman/db/rls-context");
// Sprint 5.2 item 3 — one-way outbound .ics feed, keyed by
// consultant_profiles.calendar_sync_token (docs/schema-details.md §3.8,
// docs/api-patterns.md's "calendar-feed.ics" note). Deliberately outside the
// bearer-JWT model: calendar apps can't send an Authorization header, so the
// token in the URL itself is the secret — mounted ahead of authMiddleware in
// index.ts, same reasoning as google-oauth-callback.router.ts. Rotating the
// token (not built here) would immediately invalidate any shared link.
exports.calendarFeedRouter = (0, express_1.Router)();
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
function escapeIcsText(value) {
    return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function toIcsDate(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
exports.calendarFeedRouter.get("/:token.ics", async (req, res) => {
    const token = req.params.token;
    const consultant = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID }, (tx) => tx.consultantProfile.findUnique({ where: { calendarSyncToken: token } }));
    if (!consultant)
        return res.status(404).send("Not found");
    const appointments = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID }, (tx) => tx.appointment.findMany({
        where: {
            status: { in: ["APPROVED", "COMPLETED"] },
            case: { consultantId: consultant.id },
        },
        include: { case: { include: { client: true } } },
        orderBy: { scheduledStart: "asc" },
    }));
    const now = toIcsDate(new Date());
    const events = appointments.map((appointment) => {
        const summary = escapeIcsText(`Appointment with ${appointment.case.client.fullName}`);
        const description = appointment.meetingLink
            ? escapeIcsText(`Join: ${appointment.meetingLink}`)
            : "";
        return [
            "BEGIN:VEVENT",
            `UID:${appointment.id}@ayushman`,
            `DTSTAMP:${now}`,
            `DTSTART:${toIcsDate(appointment.scheduledStart)}`,
            `DTEND:${toIcsDate(appointment.scheduledEnd)}`,
            `SUMMARY:${summary}`,
            ...(description ? [`DESCRIPTION:${description}`] : []),
            "END:VEVENT",
        ].join("\r\n");
    });
    const calendar = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Ayushman//Calendar Feed//EN",
        "CALSCALE:GREGORIAN",
        `X-WR-CALNAME:${escapeIcsText(`${consultant.fullName}'s Appointments`)}`,
        ...events,
        "END:VCALENDAR",
    ].join("\r\n");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${consultant.id}.ics"`);
    res.send(calendar);
});
//# sourceMappingURL=calendar-feed.router.js.map