import { Router, Response } from "express";
import { z } from "zod";
import { AppointmentStatus, CommitmentStatus, TaskStatus, type Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnClientProfileId, getOwnConsultantProfileId } from "../lib/callerProfile";

// data_api_v4.md §7 — client_profiles, client_category_profiles, guardian_links.
// Mounted at /api/tenants/:tenantId/clients.
export const clientsRouter: Router = Router({ mergeParams: true });
clientsRouter.use(requireTenantMatch);

const listClientsQuerySchema = z.object({
  search: z.string().optional(),
  // `tag` filters via the parent Case's tags[] (per-consultant CRM tags,
  // schema §3.11) — there is no `pinned` column anywhere in the schema yet,
  // so that query param from the doc isn't implemented.
  tag: z.string().optional(),
});

// GET /tenants/:tenantId/clients
clientsRouter.get(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listClientsQuerySchema.parse(req.query);

    const clientInclude = {
      user: { select: { email: true, phone: true } },
      cases: {
        select: {
          id: true,
          category: true,
          matterKey: true,
          tags: true,
          status: true,
          consultant: { select: { fullName: true } },
          // Deadline data for the quick filters below — Commitment/Task
          // dueAt and Appointment scheduledStart, scoped to statuses that
          // still represent an open obligation or a live booking.
          commitments: {
            where: { status: CommitmentStatus.ACTIVE },
            select: { dueAt: true },
          },
          tasks: {
            where: { status: { in: [TaskStatus.OPEN, TaskStatus.OVERDUE] } },
            select: { dueAt: true, status: true },
          },
          appointments: {
            where: { status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.APPROVED] } },
            select: { scheduledStart: true },
          },
        },
      },
    };

    const clients = await withTenantContext(req.tenantContext!, async (tx) => {
      const searchFilter = query.search
        ? { fullName: { contains: query.search, mode: "insensitive" as const } }
        : {};

      if (req.user!.role === "CONSULTANT") {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (!consultantId) return [];
        return tx.clientProfile.findMany({
          where: {
            ...searchFilter,
            cases: { some: { consultantId, ...(query.tag && { tags: { has: query.tag } }) } },
          },
          include: clientInclude,
        });
      }

      // TENANT_ADMIN — all clients with a Case in this tenant.
      return tx.clientProfile.findMany({
        where: { ...searchFilter, cases: { some: { tenantId: req.params.tenantId } } },
        include: clientInclude,
      });
    });

    res.json({ data: clients });
  }
);

const createClientSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(1).max(200),
    phone: z.string().max(20).optional(),
  })
  .strict();

// POST /tenants/:tenantId/clients — invites a Client not yet known to this
// tenant. Clients are platform-level, so this first checks for an existing
// CLIENT account by email *across all tenants*; if one exists it's reused
// as-is (no new users/client_profiles row — the caller links them to this
// tenant by creating a Case next). Only creates a brand-new account if no
// platform client with that email exists yet. Used when a Tenant Admin
// books an appointment on behalf of someone with no account yet.
//
// The existence check is deliberately run with an elevated (super-admin-
// like) tenant context: client_platform_scope RLS only exposes a CLIENT row
// to a tenant that already shares a Case with them, which is exactly the
// case that doesn't exist yet here.
clientsRouter.post(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createClientSchema.parse(req.body);

    const existing = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      (tx) =>
        tx.user.findFirst({
          where: { email: body.email, role: "CLIENT" },
          include: { clientProfile: true },
        })
    );
    if (existing) {
      res.status(200).json({ data: existing });
      return;
    }

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email
    );
    if (inviteError || !invited.user) {
      throw new AppError(
        502,
        `Failed to invite client: ${inviteError?.message ?? "unknown error"}`,
        "INVITE_FAILED"
      );
    }

    const profile = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      (tx) =>
        tx.user.create({
          data: {
            supabaseAuthUserId: invited.user!.id,
            role: "CLIENT",
            email: body.email,
            phone: body.phone,
            clientProfile: {
              create: {
                fullName: body.fullName,
              },
            },
          },
          include: { clientProfile: true },
        })
    );

    res.status(201).json({ data: profile });
  }
);

// Clients are platform-level, so "belongs to this tenant" is no longer a
// column check — it means the client has at least one Case with a
// consultant in req.params.tenantId.
async function assertClientReadAccess(
  tx: Prisma.TransactionClient,
  req: TenantScopedRequest,
  clientId: string
) {
  const client = await tx.clientProfile.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

  if (req.user!.role === "CLIENT") {
    const ownId = await getOwnClientProfileId(tx, req.user!.id);
    if (ownId !== clientId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
    return client;
  }
  if (req.user!.role === "CONSULTANT") {
    const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
    const linked = consultantId
      ? await tx.case.findFirst({ where: { clientId, consultantId } })
      : null;
    if (!linked) throw new AppError(403, "Forbidden", "NOT_A_LINKED_CLIENT");
    return client;
  }
  // TENANT_ADMIN, SUPER_ADMIN — must have at least one Case for this client
  // in the tenant this request is scoped to.
  if (!(await clientHasCaseInTenant(tx, clientId, req.params.tenantId))) {
    throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
  }
  return client;
}

async function clientHasCaseInTenant(
  tx: Prisma.TransactionClient,
  clientId: string,
  tenantId: string
) {
  const found = await tx.case.findFirst({ where: { clientId, tenantId } });
  return found !== null;
}

// Cases + appointments + client-visible document counts for this client —
// backs the CLIENT's own dashboard (upcoming/past appointments, stats) and
// the self-booking flow's case/consultant picker, which have no other read
// path since GET /clients (list) is CONSULTANT/TENANT_ADMIN/SUPER_ADMIN only.
const clientDetailInclude = {
  user: { select: { email: true, phone: true } },
  cases: {
    select: {
      id: true,
      tenantId: true,
      status: true,
      category: true,
      matterKey: true,
      consultant: {
        select: {
          id: true,
          fullName: true,
          category: true,
          consultationFee: true,
          currency: true,
        },
      },
      appointments: {
        select: {
          id: true,
          scheduledStart: true,
          scheduledEnd: true,
          status: true,
          meetingLink: true,
        },
        orderBy: { scheduledStart: "desc" as const },
      },
      _count: {
        select: { documents: { where: { isClientVisible: true } } },
      },
    },
  },
};

// Case has no `tenant` relation in the Prisma schema (tenant_id carries no DB
// foreign key — see 02-tenants.sql), so clientDetailInclude can't nest it.
// This attaches { slug, displayName } onto each case client-side from a
// separate lookup instead.
async function attachTenants<T extends { cases: { tenantId: string }[] } | null>(
  tx: Prisma.TransactionClient,
  client: T
): Promise<T> {
  if (!client) return client;
  const tenantIds = [...new Set(client.cases.map((c) => c.tenantId))];
  const tenants = await tx.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, slug: true, displayName: true },
  });
  const byId = new Map(tenants.map((t) => [t.id, { slug: t.slug, displayName: t.displayName }]));
  return {
    ...client,
    cases: client.cases.map((c) => ({ ...c, tenant: byId.get(c.tenantId) ?? null })),
  } as T;
}

// GET /tenants/:tenantId/clients/:clientId
clientsRouter.get(
  "/:clientId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const client = await withTenantContext(req.tenantContext!, async (tx) => {
      await assertClientReadAccess(tx, req, req.params.clientId);
      const found = await tx.clientProfile.findUnique({
        where: { id: req.params.clientId },
        include: clientDetailInclude,
      });
      return attachTenants(tx, found);
    });
    res.json({ data: client });
  }
);

// Clients are platform-level and hold Cases with consultants across
// multiple tenants, so their own dashboard/booking flow can't scope to a
// single :tenantId the way every other route here does. Exported
// separately so index.ts can mount it at /api/clients, ahead of
// tenantContextMiddleware (no tenant to resolve from the URL/host for this
// call) — same pattern as meRouter. RLS grants the read via the
// client_platform_self_read policies (06-client-platform-self-read.sql),
// not via req.tenantContext, since app.tenant_id is null here.
export const platformClientsRouter: Router = Router();

// GET /clients/me — the CLIENT's own profile with Cases/appointments
// aggregated across every tenant they have a Case with.
platformClientsRouter.get(
  "/me",
  requireRole("CLIENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = await withTenantContext(
      { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
      async (tx) => {
        const ownId = await getOwnClientProfileId(tx, req.user!.id);
        if (!ownId) return null;
        const found = await tx.clientProfile.findUnique({
          where: { id: ownId },
          include: clientDetailInclude,
        });
        return attachTenants(tx, found);
      }
    );
    res.json({ data: client });
  }
);

const searchTenantsQuerySchema = z.object({
  search: z.string().optional(),
});

// GET /clients/tenants — platform-wide organization directory search, so a
// CLIENT can find and book with a tenant they have no Case with yet (RLS:
// tenant_directory_read, 07-tenant-directory-read.sql). Deliberately minimal
// fields — this is a public-style directory listing, not tenant admin data.
platformClientsRouter.get(
  "/tenants",
  requireRole("CLIENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    const query = searchTenantsQuerySchema.parse(req.query);

    const tenants = await withTenantContext(
      { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
      (tx) =>
        tx.tenant.findMany({
          where: {
            status: "ACTIVE",
            ...(query.search && {
              OR: [
                { displayName: { contains: query.search, mode: "insensitive" } },
                { slug: { contains: query.search, mode: "insensitive" } },
              ],
            }),
          },
          select: { id: true, slug: true, displayName: true, logoUrl: true },
          take: 20,
          orderBy: { displayName: "asc" },
        })
    );

    res.json({ data: tenants });
  }
);

const patchClientSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    preferredLanguage: z.string().max(50).optional(),
    timezone: z.string().max(50).optional(),
    emergencyContactName: z.string().max(200).optional(),
    emergencyContactPhone: z.string().max(20).optional(),
    dob: z.string().optional(), // rejected below if a consented guardian link already exists
  })
  .strict();

// PATCH /tenants/:tenantId/clients/:clientId — self (CLIENT), TENANT_ADMIN,
// SUPER_ADMIN (support edits). dob is immutable once a guardian consent row exists.
clientsRouter.patch(
  "/:clientId",
  requireRole("CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const { dob, ...updates } = patchClientSchema.parse(req.body);

    const client = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
      if (!target) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      if (req.user!.role === "CLIENT") {
        const ownId = await getOwnClientProfileId(tx, req.user!.id);
        if (ownId !== req.params.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
      } else if (!(await clientHasCaseInTenant(tx, req.params.clientId, req.params.tenantId))) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }

      if (dob !== undefined) {
        const consented = await tx.guardianLink.findFirst({
          where: { minorClientId: req.params.clientId, consentGivenAt: { not: null } },
        });
        if (consented) {
          throw new AppError(
            422,
            "dob is immutable once guardian consent has been given",
            "DOB_LOCKED"
          );
        }
      }

      return tx.clientProfile.update({
        where: { id: req.params.clientId },
        data: { ...updates, ...(dob !== undefined && { dob: new Date(dob) }) },
      });
    });

    res.json({ data: client });
  }
);

// DELETE /tenants/:tenantId/clients/:clientId — deactivates only (via the
// linked User's accountStatus; case history is never deleted —
// client_profiles itself carries no status column). Mirrors
// consultants.router.ts's DELETE handler.
clientsRouter.delete(
  "/:clientId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const client = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
      if (!client || !(await clientHasCaseInTenant(tx, client.id, req.params.tenantId))) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }
      await tx.user.update({
        where: { id: client.userId },
        data: { accountStatus: "SUSPENDED" },
      });
    });
    res.status(204).send();
  }
);

// GET /tenants/:tenantId/clients/:clientId/category-profiles
clientsRouter.get(
  "/:clientId/category-profiles",
  requireRole("CONSULTANT", "TENANT_ADMIN", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const profiles = await withTenantContext(req.tenantContext!, async (tx) => {
      await assertClientReadAccess(tx, req, req.params.clientId);
      return tx.clientCategoryProfile.findMany({ where: { clientId: req.params.clientId } });
    });
    res.json({ data: profiles });
  }
);

const categoryEnum = z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]);
const putCategoryProfileSchema = z.object({ data: z.record(z.string(), z.unknown()) }).strict();

// PUT /tenants/:tenantId/clients/:clientId/category-profiles/:category — self
// (CLIENT), CONSULTANT (own, intake on behalf of client). Upserts on the
// (clientId, category) unique constraint.
clientsRouter.put(
  "/:clientId/category-profiles/:category",
  requireRole("CLIENT", "CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const category = categoryEnum.parse(req.params.category);
    const body = putCategoryProfileSchema.parse(req.body);

    const profile = await withTenantContext(req.tenantContext!, async (tx) => {
      const client = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
      if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

      if (req.user!.role === "CLIENT") {
        const ownId = await getOwnClientProfileId(tx, req.user!.id);
        if (ownId !== req.params.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
      } else {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        const activeCase = consultantId
          ? await tx.case.findFirst({
              where: { clientId: req.params.clientId, consultantId, category },
            })
          : null;
        if (!activeCase) throw new AppError(403, "Forbidden", "NO_ACTIVE_CASE_IN_CATEGORY");
      }

      return tx.clientCategoryProfile.upsert({
        where: { clientId_category: { clientId: req.params.clientId, category } },
        create: {
          clientId: req.params.clientId,
          category,
          data: body.data as any,
        },
        update: { data: body.data as any },
      });
    });

    res.json({ data: profile });
  }
);

const createGuardianLinkSchema = z
  .object({
    minorClientId: z.string().uuid(),
    relationship: z.string().min(1).max(50),
  })
  .strict();

// POST /tenants/:tenantId/clients/:clientId/guardians — self (adult CLIENT).
// `:clientId` in the doc's path is the caller's own profile; the dependent's
// existing client_profiles row id is supplied in the body as minorClientId.
// Ownership of the new guardian_links row is established by this call itself.
clientsRouter.post(
  "/:clientId/guardians",
  requireRole("CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createGuardianLinkSchema.parse(req.body);

    const link = await withTenantContext(req.tenantContext!, async (tx) => {
      const ownId = await getOwnClientProfileId(tx, req.user!.id);
      if (ownId !== req.params.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");

      const minor = await tx.clientProfile.findUnique({ where: { id: body.minorClientId } });
      if (!minor) {
        throw new AppError(404, "Dependent client profile not found", "CLIENT_NOT_FOUND");
      }

      return tx.guardianLink.create({
        data: {
          minorClientId: body.minorClientId,
          guardianUserId: req.user!.id,
          relationship: body.relationship,
        },
      });
    });

    res.status(201).json({ data: link });
  }
);

// GET /tenants/:tenantId/clients/:clientId/guardians
clientsRouter.get(
  "/:clientId/guardians",
  requireRole("CLIENT", "CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const links = await withTenantContext(req.tenantContext!, async (tx) => {
      await assertClientReadAccess(tx, req, req.params.clientId);
      return tx.guardianLink.findMany({ where: { minorClientId: req.params.clientId } });
    });
    res.json({ data: links });
  }
);

// data_api_v4.md §7 puts these two routes at /tenants/:tenantId/guardian-links/...,
// a sibling of /clients rather than nested under it — exported separately so
// index.ts can mount it at the matching path.
export const guardianLinksRouter: Router = Router({ mergeParams: true });
guardianLinksRouter.use(requireTenantMatch);

// POST /tenants/:tenantId/guardian-links/:linkId/consent — only the
// guardian_user_id on that specific row may consent.
guardianLinksRouter.post(
  "/:linkId/consent",
  requireRole("CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const link = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.guardianLink.findUnique({ where: { id: req.params.linkId } });
      if (!target) {
        throw new AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
      }
      if (target.guardianUserId !== req.user!.id) {
        throw new AppError(403, "Forbidden", "NOT_THE_GUARDIAN");
      }
      return tx.guardianLink.update({
        where: { id: req.params.linkId },
        data: { consentGivenAt: new Date() },
      });
    });
    res.json({ data: link });
  }
);

// DELETE /tenants/:tenantId/guardian-links/:linkId — guardian, TENANT_ADMIN.
guardianLinksRouter.delete(
  "/:linkId",
  requireRole("CLIENT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.guardianLink.findUnique({ where: { id: req.params.linkId } });
      if (!target) {
        throw new AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
      }
      if (req.user!.role === "CLIENT" && target.guardianUserId !== req.user!.id) {
        throw new AppError(403, "Forbidden", "NOT_THE_GUARDIAN");
      }
      if (
        req.user!.role === "TENANT_ADMIN" &&
        !(await clientHasCaseInTenant(tx, target.minorClientId, req.params.tenantId))
      ) {
        throw new AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
      }
      await tx.guardianLink.delete({ where: { id: req.params.linkId } });
    });
    res.status(204).send();
  }
);
