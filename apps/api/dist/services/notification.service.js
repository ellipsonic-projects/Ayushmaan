"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchConsultantOnboarded = dispatchConsultantOnboarded;
exports.dispatchTenantSignupPending = dispatchTenantSignupPending;
exports.dispatchTenantApprovalDecision = dispatchTenantApprovalDecision;
exports.alreadyNotified = alreadyNotified;
exports.getPreferredLeadTimeMins = getPreferredLeadTimeMins;
exports.dispatch = dispatch;
const smtp_1 = require("../integrations/smtp");
const email_layout_1 = require("../lib/email-layout");
const ALL_CHANNELS = ["IN_APP", "EMAIL"];
// Sprint 5.1 item 5 — "Consultant onboarded" goes to the Tenant Admin(s) and
// every other Consultant already in that tenant, not just the person invited.
async function dispatchConsultantOnboarded(tx, { tenantId, newConsultantName, excludeUserId, }) {
    const recipients = await tx.user.findMany({
        where: {
            tenantId,
            role: { in: ["TENANT_ADMIN", "CONSULTANT"] },
            id: { not: excludeUserId },
        },
        select: { id: true },
    });
    const message = {
        subject: "New consultant onboarded",
        body: `${newConsultantName} has joined your practice as a consultant.`,
    };
    for (const recipient of recipients) {
        await dispatch(tx, {
            tenantId,
            userId: recipient.id,
            type: "CONSULTANT_ONBOARDED",
            message,
        });
    }
}
// New tenant signup awaiting review — goes to every SUPER_ADMIN (they have
// tenantId: null, so there's no tenant to scope the recipient query by; the
// new tenant's own id is used as Notification.tenantId purely as a record
// label, since dispatch()/the schema require one and SUPER_ADMINs bypass
// tenant-scoped RLS anyway via isSuperAdmin context).
async function dispatchTenantSignupPending(tx, { tenantId, tenantDisplayName }) {
    const recipients = await tx.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
    });
    const message = {
        subject: "New organization awaiting approval",
        body: `${tenantDisplayName} has signed up and is awaiting your approval.`,
    };
    for (const recipient of recipients) {
        await dispatch(tx, {
            tenantId,
            userId: recipient.id,
            type: "TENANT_SIGNUP_PENDING",
            message,
            payload: { tenantId },
        });
    }
}
// A SUPER_ADMIN's approve/reject decision on a pending tenant signup — goes
// to that tenant's own TENANT_ADMIN(s).
async function dispatchTenantApprovalDecision(tx, { tenantId, approved, rejectionReason, }) {
    const recipients = await tx.user.findMany({
        where: { tenantId, role: "TENANT_ADMIN" },
        select: { id: true },
    });
    const message = approved
        ? { subject: "Your organization has been approved", body: "Your organization is now active." }
        : {
            subject: "Your organization signup was rejected",
            body: rejectionReason
                ? `Reason: ${rejectionReason}`
                : "Please contact support for details.",
        };
    for (const recipient of recipients) {
        await dispatch(tx, {
            tenantId,
            userId: recipient.id,
            type: approved ? "TENANT_SIGNUP_APPROVED" : "TENANT_SIGNUP_REJECTED",
            message,
        });
    }
}
// Time-based reminders (reminders.ts) have no due-date-passed condition to
// naturally stop them from re-firing every cron tick, unlike task_reminders'
// own sent_at column — so they dedupe against the Notification log itself:
// "has this user already been sent this type for this entity" via a JSON
// path filter on payload, keyed by the id field name the caller used when
// dispatching (e.g. { appointmentId: "..." }).
async function alreadyNotified(tx, { userId, type, entityKey, entityId, }) {
    const existing = await tx.notification.findFirst({
        where: { userId, type, payload: { path: [entityKey], equals: entityId } },
        select: { id: true },
    });
    return existing !== null;
}
// Reminders read the user's own configured lead time (falls back to
// defaultMins if the user hasn't set one, or has no preference row yet —
// same "missing row = default" rule as dispatch()'s enabled check).
async function getPreferredLeadTimeMins(tx, { userId, type, defaultMins }) {
    const preferences = await tx.notificationPreference.findMany({
        where: { userId, type, enabled: true, leadTimeMins: { not: null } },
    });
    if (preferences.length === 0)
        return defaultMins;
    return Math.max(...preferences.map((p) => p.leadTimeMins));
}
async function dispatch(tx, { tenantId, userId, type, message, payload }) {
    const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
    });
    if (!user)
        return;
    const preferences = await tx.notificationPreference.findMany({
        where: { userId, type },
    });
    const preferenceByChannel = new Map(preferences.map((p) => [p.channel, p]));
    for (const channel of ALL_CHANNELS) {
        const preference = preferenceByChannel.get(channel);
        if (preference && !preference.enabled)
            continue;
        const sentAt = new Date();
        try {
            if (channel === "EMAIL") {
                await (0, smtp_1.sendEmail)(user.email, message.subject, (0, email_layout_1.wrapEmailHtml)((0, email_layout_1.textToHtml)(message.body)));
            }
            // IN_APP has no external send — the Notification row itself is the delivery.
            await tx.notification.create({
                data: {
                    tenantId,
                    userId,
                    type,
                    channel,
                    payload: payload ?? {},
                    sentAt,
                },
            });
        }
        catch (err) {
            console.error(`[notification] dispatch failed userId=${userId} type=${type} channel=${channel}:`, err);
        }
    }
}
//# sourceMappingURL=notification.service.js.map