import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma, ConsultantCategory } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { AppError } from "../middleware/errorHandler";
import { sendEmail } from "../integrations/smtp";
import { textToHtml, wrapEmailHtml } from "../lib/email-layout";

// Broadcasts (schema: `broadcasts`) — Super Admin-authored platform
// announcements. Sending fans out one Notification (type=PLATFORM_BROADCAST)
// per resolved recipient per selected channel; no scheduled dispatch exists
// yet (every broadcast sends immediately on POST) — see the plan note on
// deployment-controls-panel.tsx for why that's deliberately out of scope.
export const platformNotifyRouter: Router = Router();
platformNotifyRouter.use(requireRole("SUPER_ADMIN"));

const CONSULTANT_CATEGORIES = [
  "MEDICAL",
  "LEGAL",
  "IT",
  "PHYSIOTHERAPY",
  "HOMEOPATHY",
  "ASTROLOGY",
] as const;

const audienceFilterSchema = z.object({
  scope: z.enum(["GLOBAL", "TARGETED_CLIENT"]),
  targetClientId: z.string().uuid().optional(),
  targetTenantIds: z.array(z.string().uuid()).default([]),
  // GLOBAL only; ALL = current staff+client bundling, the others isolate one audience.
  targetRole: z.enum(["ALL", "TENANT_ADMIN", "CONSULTANT", "CLIENT"]).default("ALL"),
  targetConsultantCategory: z.enum(CONSULTANT_CATEGORIES).optional(),
  targetClientSegment: z.enum(["ACTIVE", "ON_HOLD"]).optional(),
});

type AudienceFilter = z.infer<typeof audienceFilterSchema>;

// A resolved recipient plus the tenant to label their Notification row with.
// Notification.tenant_id is a record label, not an access boundary here — a
// SUPER_ADMIN's own reads/writes bypass tenant-scoped RLS regardless (see
// notification.service.ts's dispatchTenantSignupPending for the same
// reasoning) — so for a CLIENT recipient (whose own `users.tenant_id` is
// always null, per schema) we label it with the tenant of the case that
// qualified them for this broadcast.
type Recipient = { userId: string; tenantId: string };

// Resolves who a broadcast (or an estimate of one) would reach.
// TENANT_ADMIN/CONSULTANT recipients come straight off `users.tenant_id`;
// CLIENT recipients have no tenant_id of their own, so "target tenants" for
// a client means "has a case under one of those tenants" instead — resolved
// via `cases.client_id`.
async function resolveAudienceRecipients(
  tx: Prisma.TransactionClient,
  filter: AudienceFilter
): Promise<Recipient[]> {
  if (filter.scope === "TARGETED_CLIENT") {
    if (!filter.targetClientId) return [];
    const client = await tx.clientProfile.findUnique({
      where: { id: filter.targetClientId },
      select: {
        userId: true,
        cases: { orderBy: { createdAt: "desc" }, take: 1, select: { tenantId: true } },
      },
    });
    if (!client || client.cases.length === 0) return [];
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
  if (tenantIds.length === 0) return [];

  const staffRoles: ("TENANT_ADMIN" | "CONSULTANT")[] =
    filter.targetRole === "CLIENT"
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
                  category: filter.targetConsultantCategory as ConsultantCategory,
                },
              }
            : {}),
        },
        select: { id: true, tenantId: true },
      })
    : [];
  const staffRecipients: Recipient[] = staffUsers.map((u) => ({
    userId: u.id,
    tenantId: u.tenantId as string,
  }));

  // A CONSULTANT-category filter or a staff-only targetRole narrows to staff
  // — no CLIENT reads a "specialist role" or a "tenant admin" role, so skip
  // the client join in that case.
  if (
    filter.targetConsultantCategory ||
    filter.targetRole === "TENANT_ADMIN" ||
    filter.targetRole === "CONSULTANT"
  )
    return staffRecipients;

  const cases = await tx.case.findMany({
    where: {
      tenantId: { in: tenantIds },
      ...(filter.targetClientSegment ? { status: filter.targetClientSegment } : {}),
    },
    select: { clientId: true, tenantId: true },
    orderBy: { createdAt: "desc" },
  });
  const tenantIdByClientProfileId = new Map<string, string>();
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
  const clientRecipients: Recipient[] = clientProfiles.map((c) => ({
    userId: c.userId,
    tenantId: tenantIdByClientProfileId.get(c.id)!,
  }));

  const byUserId = new Map<string, Recipient>();
  for (const r of [...staffRecipients, ...clientRecipients]) byUserId.set(r.userId, r);
  return [...byUserId.values()];
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /platform/notify/broadcasts
platformNotifyRouter.get("/broadcasts", async (req: AuthenticatedRequest, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const broadcasts = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      tx.broadcast.findMany({
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        take: query.limit,
      })
  );
  res.json({ data: broadcasts });
});

// GET /platform/notify/stats
platformNotifyRouter.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
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
    }
  );

  res.json({ data: stats });
});

// GET /platform/notify/audience-estimate
platformNotifyRouter.get("/audience-estimate", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = audienceFilterSchema
    .extend({ targetTenantIds: z.array(z.string().uuid()).optional() })
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

  const recipients = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      resolveAudienceRecipients(tx, { ...parsed, targetTenantIds: parsed.targetTenantIds ?? [] })
  );

  res.json({ data: { recipientCount: recipients.length } });
});

const createBroadcastSchema = z
  .object({
    title: z.string().min(1).max(255),
    body: z.string().min(1),
    urgency: z.enum(["INFO", "WARNING", "CRITICAL"]),
    channels: z.array(z.enum(["IN_APP", "EMAIL"])).min(1),
  })
  .and(audienceFilterSchema)
  .refine((v) => v.scope !== "TARGETED_CLIENT" || !!v.targetClientId, {
    message: "targetClientId is required when scope is TARGETED_CLIENT",
  });

// POST /platform/notify/broadcasts — resolves the audience and sends
// immediately (no draft/scheduled state — see router header comment).
platformNotifyRouter.post("/broadcasts", async (req: AuthenticatedRequest, res: Response) => {
  const body = createBroadcastSchema.parse(req.body);

  const { broadcast, recipients } = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      const recipients = await resolveAudienceRecipients(tx, body);
      if (recipients.length === 0) {
        throw new AppError(422, "No recipients match this audience", "NO_RECIPIENTS");
      }

      const created = await tx.broadcast.create({
        data: {
          createdBySuperAdminId: req.user!.id,
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
      const disabledKeys = new Set(
        preferences.filter((p) => !p.enabled).map((p) => `${p.userId}:${p.channel}`)
      );

      await tx.notification.createMany({
        data: recipients.flatMap(({ userId, tenantId }) =>
          body.channels
            .filter((channel) => !disabledKeys.has(`${userId}:${channel}`))
            .map((channel) => ({
              tenantId,
              userId,
              type: "PLATFORM_BROADCAST" as const,
              channel,
              payload,
              sentAt: new Date(),
            }))
        ),
      });

      return { broadcast: created, recipients };
    }
  );

  if (body.channels.includes("EMAIL")) {
    const emailRecipients = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      (tx) =>
        tx.user.findMany({
          where: { id: { in: recipients.map((r) => r.userId) } },
          select: { email: true },
        })
    );
    const html = wrapEmailHtml(textToHtml(body.body));
    await Promise.all(
      emailRecipients.map((u) =>
        sendEmail(u.email, body.title, html).catch((err) =>
          console.error(`[broadcast] email send failed to ${u.email}:`, err)
        )
      )
    );
  }

  res.status(201).json({ data: broadcast });
});
