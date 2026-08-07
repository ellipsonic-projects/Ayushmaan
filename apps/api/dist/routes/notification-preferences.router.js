"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferencesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
// Mounted at /api/tenants/:tenantId/notification-preferences
// (docs/api-patterns.md §21). notification_preferences carries no tenant_id
// column — it's a self-only, global-per-user table — so every query here is
// hard-filtered to req.user.id and the :tenantId path param exists purely to
// match the app's URL/auth convention, never as a data filter.
exports.notificationPreferencesRouter = (0, express_1.Router)({ mergeParams: true });
exports.notificationPreferencesRouter.use(require_tenant_match_1.requireTenantMatch);
exports.notificationPreferencesRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN", "TENANT_ADMIN", "CONSULTANT", "CLIENT"));
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
const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "WHATSAPP"];
// GET /tenants/:tenantId/notification-preferences — full type x channel grid,
// filling in the schema's default (enabled=true, no lead time) for any
// combination the caller hasn't explicitly set yet.
exports.notificationPreferencesRouter.get("/", async (req, res) => {
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
exports.notificationPreferencesRouter.put("/", async (req, res) => {
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
//# sourceMappingURL=notification-preferences.router.js.map