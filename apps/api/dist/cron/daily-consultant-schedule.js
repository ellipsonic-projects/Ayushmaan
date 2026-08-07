"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepDailyConsultantSchedule = sweepDailyConsultantSchedule;
exports.startDailyConsultantScheduleCron = startDailyConsultantScheduleCron;
const node_cron_1 = __importDefault(require("node-cron"));
const rls_context_1 = require("@ayushman/db/rls-context");
const notification_service_1 = require("../services/notification.service");
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
// Sends each consultant a summary of all their appointments for the day at
// the start time of their first appointment.  Runs every minute; the
// deduplication check (alreadyNotified) ensures each consultant is notified
// at most once per calendar day.
async function sweepDailyConsultantSchedule() {
    const now = new Date();
    await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID }, async (tx) => {
        const startOfTodayUTC = new Date(now);
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);
        const endOfTodayUTC = new Date(now);
        endOfTodayUTC.setUTCHours(23, 59, 59, 999);
        const appointments = await tx.appointment.findMany({
            where: {
                status: "APPROVED",
                scheduledStart: { gte: startOfTodayUTC, lte: endOfTodayUTC },
            },
            include: {
                case: {
                    include: {
                        client: { include: { user: true } },
                        consultant: { include: { user: true } },
                    },
                },
            },
        });
        // Group by consultant, tracking earliest appointment per consultant.
        const byConsultant = new Map();
        for (const appt of appointments) {
            const consultant = appt.case.consultant;
            if (!consultant)
                continue;
            const existing = byConsultant.get(consultant.id);
            if (existing) {
                existing.appointments.push(appt);
                if (appt.scheduledStart < existing.firstStart) {
                    existing.firstStart = appt.scheduledStart;
                }
            }
            else {
                byConsultant.set(consultant.id, {
                    tenantId: consultant.tenantId,
                    consultantUserId: consultant.user.id,
                    consultantName: consultant.fullName,
                    timezone: consultant.timezone,
                    appointments: [appt],
                    firstStart: appt.scheduledStart,
                });
            }
        }
        // For each consultant, if their first appointment is starting within
        // the next 2 minutes (cron runs every minute, so this catches the
        // exact start minute), send the daily schedule.
        const WINDOW_MS = 2 * 60 * 1000;
        for (const [, info] of byConsultant) {
            const msUntilFirst = info.firstStart.getTime() - now.getTime();
            if (msUntilFirst < 0 || msUntilFirst > WINDOW_MS)
                continue;
            const dateKey = info.firstStart.toISOString().slice(0, 10);
            if (await (0, notification_service_1.alreadyNotified)(tx, {
                userId: info.consultantUserId,
                type: "APPOINTMENT_REMINDER",
                entityKey: "dailyScheduleDate",
                entityId: dateKey,
            })) {
                continue;
            }
            // Sort appointments by start time and build a human-readable list.
            const sorted = info.appointments.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
            const tz = info.timezone || "Asia/Kolkata";
            const scheduleLines = sorted.map((appt) => {
                const localTime = appt.scheduledStart.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: tz,
                });
                const clientName = appt.case.client?.user ? `${appt.case.client.user.email}` : "Client";
                return `• ${localTime} — ${clientName}`;
            });
            const message = [
                `Good morning, ${info.consultantName}. You have ${sorted.length} appointment${sorted.length > 1 ? "s" : ""} today:`,
                "",
                ...scheduleLines,
                "",
                "Have a productive day!",
            ].join("\n");
            await (0, notification_service_1.dispatch)(tx, {
                tenantId: info.tenantId,
                userId: info.consultantUserId,
                type: "APPOINTMENT_REMINDER",
                message: { subject: "Your schedule for today", body: message },
                payload: { dailyScheduleDate: dateKey },
            });
        }
    });
}
function startDailyConsultantScheduleCron() {
    node_cron_1.default.schedule("* * * * *", () => {
        sweepDailyConsultantSchedule().catch((err) => {
            console.error("[cron] daily-consultant-schedule failed:", err);
        });
    });
}
//# sourceMappingURL=daily-consultant-schedule.js.map