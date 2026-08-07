"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformNotifyRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const errorHandler_1 = require("../middleware/errorHandler");
const smtp_1 = require("../integrations/smtp");
const email_layout_1 = require("../lib/email-layout");
// Broadcasts (schema: `broadcasts`) — Super Admin-authored platform
// announcements. Sending fans out one Notification (type=PLATFORM_BROADCAST)
// per resolved recipient per selected channel; no scheduled dispatch exists
// yet (every broadcast sends immediately on POST) — see the plan note on
// deployment-controls-panel.tsx for why that's deliberately out of scope.
exports.platformNotifyRouter = (0, express_1.Router)();
exports.platformNotifyRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
const CONSULTANT_CATEGORIES = [
    "MEDICAL",
    "LEGAL",
    "IT",
    "PHYSIOTHERAPY",
    "HOMEOPATHY",
    "ASTROLOGY",
];
const audienceFilterSchema = zod_1.z.object({
    scope: zod_1.z.enum(["GLOBAL", "TARGETED_CLIENT"]),
    targetClientId: zod_1.z.string().uuid().optional(),
    targetTenantIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    // GLOBAL only; ALL = current staff+client bundling, the others isolate one audience.
    targetRole: zod_1.z.enum(["ALL", "TENANT_ADMIN", "CONSULTANT", "CLIENT"]).default("ALL"),
    targetConsultantCategory: zod_1.z.enum(CONSULTANT_CATEGORIES).optional(),
    targetClientSegment: zod_1.z.enum(["ACTIVE", "ON_HOLD"]).optional(),
});
// Resolves who a broadcast (or an estimate of one) would reach.
// TENANT_ADMIN/CONSULTANT recipients come straight off `users.tenant_id`;
// CLIENT recipients have no tenant_id of their own, so "target tenants" for
// a client means "has a case under one of those tenants" instead — resolved
// via `cases.client_id`.
async function resolveAudienceRecipients(tx, filter) {
    if (filter.scope === "TARGETED_CLIENT") {
        if (!filter.targetClientId)
            return [];
        const client = await tx.clientProfile.findUnique({
            where: { id: filter.targetClientId },
            select: {
                userId: true,
                cases: { orderBy: { createdAt: "desc" }, take: 1, select: { tenantId: true } },
            },
        });
        if (!client || client.cases.length === 0)
            return [];
        return [{ userId: client.userId, tenantId: client.cases[0].tenantId }];
    }
    const tenants = await tx.tenant.findMany({
        where: {
            status: "ACTIVE",
            ...(filter.targetTenantIds.length > 0 ? { id: { in: filter.targetTenantIds } } : {}),
        },
        select: { id: true },
    });
    const tenantIds = tenants.map((t) => t.id);
    if (tenantIds.length === 0)
        return [];
    const staffRoles = filter.targetRole === "CLIENT"
        ? []
        : filter.targetRole === "TENANT_ADMIN" || filter.targetRole === "CONSULTANT"
            ? [filter.targetRole]
            : ["TENANT_ADMIN", "CONSULTANT"];
    const staffUsers = staffRoles.length
        ? await tx.user.findMany({
            where: {
                tenantId: { in: tenantIds },
                role: { in: staffRoles },
                ...(filter.targetConsultantCategory
                    ? {
                        consultantProfile: {
                            category: filter.targetConsultantCategory,
                        },
                    }
                    : {}),
            },
            select: { id: true, tenantId: true },
        })
        : [];
    const staffRecipients = staffUsers.map((u) => ({
        userId: u.id,
        tenantId: u.tenantId,
    }));
    // A CONSULTANT-category filter or a staff-only targetRole narrows to staff
    // — no CLIENT reads a "specialist role" or a "tenant admin" role, so skip
    // the client join in that case.
    if (filter.targetConsultantCategory ||
        filter.targetRole === "TENANT_ADMIN" ||
        filter.targetRole === "CONSULTANT")
        return staffRecipients;
    const cases = await tx.case.findMany({
        where: {
            tenantId: { in: tenantIds },
            ...(filter.targetClientSegment ? { status: filter.targetClientSegment } : {}),
        },
        select: { clientId: true, tenantId: true },
        orderBy: { createdAt: "desc" },
    });
    const tenantIdByClientProfileId = new Map();
    for (const c of cases) {
        if (!tenantIdByClientProfileId.has(c.clientId))
            tenantIdByClientProfileId.set(c.clientId, c.tenantId);
    }
    const clientProfiles = tenantIdByClientProfileId.size
        ? await tx.clientProfile.findMany({
            where: { id: { in: [...tenantIdByClientProfileId.keys()] } },
            select: { id: true, userId: true },
        })
        : [];
    const clientRecipients = clientProfiles.map((c) => ({
        userId: c.userId,
        tenantId: tenantIdByClientProfileId.get(c.id),
    }));
    const byUserId = new Map();
    for (const r of [...staffRecipients, ...clientRecipients])
        byUserId.set(r.userId, r);
    return [...byUserId.values()];
}
const listQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
// GET /platform/notify/broadcasts
exports.platformNotifyRouter.get("/broadcasts", async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const broadcasts = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => tx.broadcast.findMany({
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        take: query.limit,
    }));
    res.json({ data: broadcasts });
});
// GET /platform/notify/stats
exports.platformNotifyRouter.get("/stats", async (req, res) => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const stats = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const [activeUrgentAlerts, sentLast30Days, recipientsAgg] = await Promise.all([
            tx.broadcast.count({
                where: { status: "SENT", urgency: "CRITICAL", sentAt: { gte: last24h } },
            }),
            tx.broadcast.count({ where: { status: "SENT", sentAt: { gte: last30d } } }),
            tx.broadcast.aggregate({
                where: { status: "SENT", sentAt: { gte: last30d } },
                _sum: { recipientCount: true },
            }),
        ]);
        return {
            activeUrgentAlerts,
            sentLast30Days,
            recipientsReachedLast30Days: recipientsAgg._sum.recipientCount ?? 0,
        };
    });
    res.json({ data: stats });
});
// GET /platform/notify/audience-estimate
exports.platformNotifyRouter.get("/audience-estimate", async (req, res) => {
    const parsed = audienceFilterSchema
        .extend({ targetTenantIds: zod_1.z.array(zod_1.z.string().uuid()).optional() })
        .parse({
        scope: req.query.scope,
        targetClientId: req.query.targetClientId || undefined,
        targetTenantIds: req.query.targetTenantIds
            ? Array.isArray(req.query.targetTenantIds)
                ? req.query.targetTenantIds
                : [req.query.targetTenantIds]
            : [],
        targetRole: req.query.targetRole || undefined,
        targetConsultantCategory: req.query.targetConsultantCategory || undefined,
        targetClientSegment: req.query.targetClientSegment || undefined,
    });
    const recipients = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => resolveAudienceRecipients(tx, { ...parsed, targetTenantIds: parsed.targetTenantIds ?? [] }));
    res.json({ data: { recipientCount: recipients.length } });
});
const createBroadcastSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(255),
    body: zod_1.z.string().min(1),
    urgency: zod_1.z.enum(["INFO", "WARNING", "CRITICAL"]),
    channels: zod_1.z.array(zod_1.z.enum(["IN_APP", "EMAIL"])).min(1),
})
    .and(audienceFilterSchema)
    .refine((v) => v.scope !== "TARGETED_CLIENT" || !!v.targetClientId, {
    message: "targetClientId is required when scope is TARGETED_CLIENT",
});
// POST /platform/notify/broadcasts — resolves the audience and sends
// immediately (no draft/scheduled state — see router header comment).
exports.platformNotifyRouter.post("/broadcasts", async (req, res) => {
    const body = createBroadcastSchema.parse(req.body);
    const { broadcast, recipients } = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const recipients = await resolveAudienceRecipients(tx, body);
        if (recipients.length === 0) {
            throw new errorHandler_1.AppError(422, "No recipients match this audience", "NO_RECIPIENTS");
        }
        const created = await tx.broadcast.create({
            data: {
                createdBySuperAdminId: req.user.id,
                title: body.title,
                body: body.body,
                urgency: body.urgency,
                scope: body.scope,
                targetClientId: body.targetClientId ?? null,
                targetTenantIds: body.targetTenantIds,
                targetConsultantCategory: body.targetConsultantCategory ?? null,
                targetClientSegment: body.targetClientSegment ?? null,
                channels: body.channels,
                status: "SENT",
                sentAt: new Date(),
                recipientCount: recipients.length,
            },
        });
        const payload = { broadcastId: created.id, title: body.title, urgency: body.urgency };
        const preferences = await tx.notificationPreference.findMany({
            where: { userId: { in: recipients.map((r) => r.userId) }, type: "PLATFORM_BROADCAST" },
        });
        const disabledKeys = new Set(preferences.filter((p) => !p.enabled).map((p) => `${p.userId}:${p.channel}`));
        await tx.notification.createMany({
            data: recipients.flatMap(({ userId, tenantId }) => body.channels
                .filter((channel) => !disabledKeys.has(`${userId}:${channel}`))
                .map((channel) => ({
                tenantId,
                userId,
                type: "PLATFORM_BROADCAST",
                channel,
                payload,
                sentAt: new Date(),
            }))),
        });
        return { broadcast: created, recipients };
    });
    if (body.channels.includes("EMAIL")) {
        const emailRecipients = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => tx.user.findMany({
            where: { id: { in: recipients.map((r) => r.userId) } },
            select: { email: true },
        }));
        const html = (0, email_layout_1.wrapEmailHtml)((0, email_layout_1.textToHtml)(body.body));
        await Promise.all(emailRecipients.map((u) => (0, smtp_1.sendEmail)(u.email, body.title, html).catch((err) => console.error(`[broadcast] email send failed to ${u.email}:`, err))));
    }
    res.status(201).json({ data: broadcast });
});
//# sourceMappingURL=platform-notify.router.js.map