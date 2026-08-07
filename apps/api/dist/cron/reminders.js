"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepReminders = sweepReminders;
exports.startRemindersCron = startRemindersCron;
const node_cron_1 = __importDefault(require("node-cron"));
const rls_context_1 = require("@ayushman/db/rls-context");
const notification_service_1 = require("../services/notification.service");
// Sprint 5.2 item 2 — appointment-adjacent reminders and out-of-office
// notices. "Due-soon tasks" is already covered by task-reminders.ts (Sprint
// 4.4/5.1); this cron covers the appointment side (APPOINTMENT_REMINDER,
// SESSION_REMINDER, SESSION_JOINING_SOON) plus commitment due-soon reminders
// and out-of-office client notices.
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_APPOINTMENT_REMINDER_MINS = 60;
const DEFAULT_SESSION_REMINDER_MINS = 30;
const DEFAULT_SESSION_JOINING_SOON_MINS = 10;
const DEFAULT_COMMITMENT_REMINDER_MINS = 60;
// Upper bound so the candidate queries stay cheap — anything further out
// than this can't possibly be "due soon" under any of the lead times above.
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
async function sweepReminders() {
    await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID }, async (tx) => {
        const now = Date.now();
        const lookaheadEnd = new Date(now + LOOKAHEAD_MS);
        const appointments = await tx.appointment.findMany({
            where: { status: "APPROVED", scheduledStart: { gte: new Date(), lte: lookaheadEnd } },
            include: { case: { include: { client: true, consultant: true } } },
        });
        for (const appointment of appointments) {
            const recipients = [
                appointment.case.client.userId,
                appointment.case.consultant?.userId,
            ].filter((id) => Boolean(id));
            for (const userId of recipients) {
                await maybeSendAppointmentReminder(tx, {
                    tenantId: appointment.tenantId,
                    userId,
                    appointmentId: appointment.id,
                    scheduledStart: appointment.scheduledStart,
                    meetingLink: appointment.meetingLink,
                    now,
                });
            }
        }
        const commitments = await tx.commitment.findMany({
            where: { status: "ACTIVE", dueAt: { gte: new Date(), lte: lookaheadEnd } },
            include: { case: { include: { consultant: true } } },
        });
        for (const commitment of commitments) {
            const userId = commitment.case.consultant?.userId;
            if (!userId || !commitment.dueAt)
                continue;
            const leadTimeMins = await (0, notification_service_1.getPreferredLeadTimeMins)(tx, {
                userId,
                type: "COMMITMENT_REMINDER",
                defaultMins: DEFAULT_COMMITMENT_REMINDER_MINS,
            });
            if (commitment.dueAt.getTime() - leadTimeMins * 60000 > now)
                continue;
            if (await (0, notification_service_1.alreadyNotified)(tx, {
                userId,
                type: "COMMITMENT_REMINDER",
                entityKey: "commitmentId",
                entityId: commitment.id,
            })) {
                continue;
            }
            await (0, notification_service_1.dispatch)(tx, {
                tenantId: commitment.tenantId,
                userId,
                type: "COMMITMENT_REMINDER",
                message: {
                    subject: "Commitment reminder",
                    body: `Reminder: "${commitment.title}" is due ${commitment.dueAt.toLocaleString()}.`,
                },
                payload: { commitmentId: commitment.id, caseId: commitment.caseId },
            });
        }
        await sweepOutOfOfficeNotices(tx);
    });
}
async function maybeSendAppointmentReminder(tx, params) {
    const { tenantId, userId, appointmentId, scheduledStart, meetingLink, now } = params;
    const reminderKinds = [
        {
            type: "APPOINTMENT_REMINDER",
            defaultMins: DEFAULT_APPOINTMENT_REMINDER_MINS,
            subject: "Upcoming appointment",
            body: `You have an appointment scheduled for ${scheduledStart.toLocaleString()}.`,
        },
        {
            type: "SESSION_REMINDER",
            defaultMins: DEFAULT_SESSION_REMINDER_MINS,
            subject: "Session reminder",
            body: `Your session starts at ${scheduledStart.toLocaleString()}.`,
        },
        {
            type: "SESSION_JOINING_SOON",
            defaultMins: DEFAULT_SESSION_JOINING_SOON_MINS,
            subject: "Session joining soon",
            body: meetingLink
                ? `Your session starts soon. Join here: ${meetingLink}`
                : `Your session starts soon at ${scheduledStart.toLocaleString()}.`,
        },
    ];
    for (const kind of reminderKinds) {
        const leadTimeMins = await (0, notification_service_1.getPreferredLeadTimeMins)(tx, {
            userId,
            type: kind.type,
            defaultMins: kind.defaultMins,
        });
        if (scheduledStart.getTime() - leadTimeMins * 60000 > now)
            continue;
        if (await (0, notification_service_1.alreadyNotified)(tx, {
            userId,
            type: kind.type,
            entityKey: "appointmentId",
            entityId: appointmentId,
        })) {
            continue;
        }
        await (0, notification_service_1.dispatch)(tx, {
            tenantId,
            userId,
            type: kind.type,
            message: { subject: kind.subject, body: kind.body },
            payload: { appointmentId },
        });
    }
}
// Sprint 5.2 item 2 — notifies clients with an upcoming appointment during a
// consultant's active out-of-office window, using the period's own
// auto_reply_message as the notice body. Fires once per (client, OOO period)
// rather than daily, since there's no separate inbound event to react to
// (docs/api-patterns.md §8 — auto_reply_message has no persisted inbound
// message model behind it).
async function sweepOutOfOfficeNotices(tx) {
    const today = new Date();
    const activePeriods = await tx.outOfOfficePeriod.findMany({
        where: {
            startDate: { lte: today },
            endDate: { gte: today },
            autoReplyMessage: { not: null },
        },
        include: { consultant: true },
    });
    for (const period of activePeriods) {
        const appointments = await tx.appointment.findMany({
            where: {
                status: { in: ["REQUESTED", "ADMIN_APPROVED", "APPROVED"] },
                scheduledStart: { gte: period.startDate, lte: period.endDate },
                case: { consultantId: period.consultantId },
            },
            include: { case: { include: { client: true } } },
        });
        const clientUserIds = [...new Set(appointments.map((a) => a.case.client.userId))];
        for (const userId of clientUserIds) {
            if (await (0, notification_service_1.alreadyNotified)(tx, {
                userId,
                type: "OUT_OF_OFFICE_NOTICE",
                entityKey: "oooPeriodId",
                entityId: period.id,
            })) {
                continue;
            }
            await (0, notification_service_1.dispatch)(tx, {
                tenantId: period.tenantId,
                userId,
                type: "OUT_OF_OFFICE_NOTICE",
                message: { subject: "Consultant out of office", body: period.autoReplyMessage },
                payload: { oooPeriodId: period.id, consultantId: period.consultantId },
            });
        }
    }
}
function startRemindersCron() {
    // Every 5 minutes — SESSION_JOINING_SOON's ~10-minute window needs
    // finer-grained checks than the coarser overdue/expiry sweeps.
    node_cron_1.default.schedule("*/5 * * * *", () => {
        sweepReminders().catch((err) => {
            console.error("[cron] reminders failed:", err);
        });
    });
}
//# sourceMappingURL=reminders.js.map