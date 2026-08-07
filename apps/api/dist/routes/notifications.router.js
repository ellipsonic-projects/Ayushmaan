"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
// notifications, notification_preferences (docs/api-patterns.md §21,
// docs/project-structure.md §3.22). Mounted at the bare
// /api/tenants/:tenantId prefix in index.ts, so requireRole is applied
// per-route rather than as a router-level .use() — see tenantSettingsRouter
// in tenants.router.ts for the same pattern and reasoning.
exports.notificationsRouter = (0, express_1.Router)({ mergeParams: true });
exports.notificationsRouter.use(require_tenant_match_1.requireTenantMatch);
const SELF_ROLES = ["SUPER_ADMIN", "TENANT_ADMIN", "CONSULTANT", "CLIENT"];
// GET /tenants/:tenantId/notifications?unreadOnly=true&cursor=<opaque>&limit=<limit>
// Hard-filtered to user_id = caller's own id for every role, including
// SUPER_ADMIN/TENANT_ADMIN — no one can view another user's notifications.
exports.notificationsRouter.get("/notifications", (0, require_role_1.requireRole)(...SELF_ROLES), async (req, res) => {
    const unreadOnly = req.query.unreadOnly === "true";
    let limit = 20;
    if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit, 10);
        if (!isNaN(parsedLimit)) {
            limit = Math.min(Math.max(parsedLimit, 1), 100);
        }
    }
    const cursorParam = req.query.cursor;
    let prismaCursor = undefined;
    if (cursorParam) {
        try {
            const decodedId = Buffer.from(cursorParam, "base64").toString("utf-8");
            if (decodedId &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId)) {
                prismaCursor = { id: decodedId };
            }
        }
        catch {
            // Ignore invalid cursor
        }
    }
    const notifications = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.notification.findMany({
        where: { userId: req.user.id, ...(unreadOnly && { readAt: null }) },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(prismaCursor && {
            cursor: prismaCursor,
            skip: 1,
        }),
    }));
    const hasNextPage = notifications.length > limit;
    const data = hasNextPage ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasNextPage && data.length > 0
        ? Buffer.from(data[data.length - 1].id).toString("base64")
        : null;
    res.json({
        data,
        meta: {
            nextCursor,
        },
    });
});
// PATCH /tenants/:tenantId/notifications/:notificationId/read
exports.notificationsRouter.patch("/notifications/:notificationId/read", (0, require_role_1.requireRole)(...SELF_ROLES), async (req, res) => {
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const notification = await tx.notification.findUnique({
            where: { id: req.params.notificationId },
        });
        if (!notification || notification.userId !== req.user.id) {
            throw new errorHandler_1.AppError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
        }
        return tx.notification.update({
            where: { id: notification.id },
            data: { readAt: notification.readAt ?? new Date() },
        });
    });
    res.json({ data: updated });
});
const NOTIFICATION_TYPES = [
    "APPOINTMENT_REMINDER",
    "TASK_DUE",
    "TASK_REMINDER",
    "GRIEVANCE_SUBMITTED",
    "GRIEVANCE_STATUS_CHANGED",
    "SESSION_JOINING_SOON",
    "SESSION_REMINDER",
    "COMMITMENT_REMINDER",
    "CONSULTANT_ONBOARDED",
    "OUT_OF_OFFICE_NOTICE",
];
const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL"];
// GET /tenants/:tenantId/notification-preferences — full type x channel grid,
// filling in the schema's default (enabled=true, no lead time) for any
// combination the caller hasn't explicitly set yet. notification_preferences
// carries no tenant_id column — it's a self-only, global-per-user table — so
// every query here is hard-filtered to req.user.id and the :tenantId path
// param exists purely to match the app's URL/auth convention, never as a
// data filter.
exports.notificationsRouter.get("/notification-preferences", (0, require_role_1.requireRole)(...SELF_ROLES), async (req, res) => {
    const preferences = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.notificationPreference.findMany({ where: { userId: req.user.id } }));
    const byKey = new Map(preferences.map((p) => [`${p.type}:${p.channel}`, p]));
    const grid = NOTIFICATION_TYPES.flatMap((type) => NOTIFICATION_CHANNELS.map((channel) => {
        const existing = byKey.get(`${type}:${channel}`);
        return {
            type,
            channel,
            enabled: existing?.enabled ?? true,
            leadTimeMins: existing?.leadTimeMins ?? null,
        };
    }));
    res.json({ data: grid });
});
const putPreferencesSchema = zod_1.z.object({
    preferences: zod_1.z
        .array(zod_1.z
        .object({
        type: zod_1.z.enum(NOTIFICATION_TYPES),
        channel: zod_1.z.enum(NOTIFICATION_CHANNELS),
        enabled: zod_1.z.boolean(),
        leadTimeMins: zod_1.z.number().int().positive().nullable().optional(),
    })
        .strict())
        .max(200),
});
// PUT /tenants/:tenantId/notification-preferences — upserts the caller's own
// rows only (docs/api-patterns.md §21: "a user can never set another user's
// preferences").
exports.notificationsRouter.put("/notification-preferences", (0, require_role_1.requireRole)(...SELF_ROLES), async (req, res) => {
    const body = putPreferencesSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const results = [];
        for (const pref of body.preferences) {
            results.push(await tx.notificationPreference.upsert({
                where: {
                    userId_type_channel: { userId: req.user.id, type: pref.type, channel: pref.channel },
                },
                create: {
                    userId: req.user.id,
                    type: pref.type,
                    channel: pref.channel,
                    enabled: pref.enabled,
                    leadTimeMins: pref.leadTimeMins ?? null,
                },
                update: {
                    enabled: pref.enabled,
                    leadTimeMins: pref.leadTimeMins ?? null,
                },
            }));
        }
        return results;
    });
    res.json({ data: updated });
});
//# sourceMappingURL=notifications.router.js.map