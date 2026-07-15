import { Router, Response } from "express";
import { z } from "zod";
import { AppointmentStatus, CommitmentStatus, TaskStatus, type Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
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
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listClientsQuerySchema.parse(req.query);

    const clientInclude = {
      user: { select: { email: true, phone: true } },
      cases: {
        select: {
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
            tenantId: req.params.tenantId,
            ...searchFilter,
            cases: { some: { consultantId, ...(query.tag && { tags: { has: query.tag } }) } },
          },
          include: clientInclude,
        });
      }

      // TENANT_ADMIN — all clients in the tenant.
      return tx.clientProfile.findMany({
        where: { tenantId: req.params.tenantId, ...searchFilter },
        include: clientInclude,
      });
    });

    res.json({ data: clients });
  }
);

async function assertClientReadAccess(
  tx: Prisma.TransactionClient,
  req: TenantScopedRequest,
  clientId: string
) {
  const client = await tx.clientProfile.findUnique({ where: { id: clientId } });
  if (!client || client.tenantId !== req.params.tenantId) {
    throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
  }

  if (req.user!.role === "TENANT_ADMIN") return client;
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
  throw new AppError(403, "Forbidden", "ROLE_FORBIDDEN");
}

// GET /tenants/:tenantId/clients/:clientId
clientsRouter.get(
  "/:clientId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const client = await withTenantContext(req.tenantContext!, (tx) =>
      assertClientReadAccess(tx, req, req.params.clientId)
    );
    res.json({ data: client });
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

// PATCH /tenants/:tenantId/clients/:clientId — self (CLIENT), TENANT_ADMIN
// (support edits). dob is immutable once a guardian consent row exists.
clientsRouter.patch(
  "/:clientId",
  requireRole("CLIENT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const { dob, ...updates } = patchClientSchema.parse(req.body);

    const client = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }
      if (req.user!.role === "CLIENT") {
        const ownId = await getOwnClientProfileId(tx, req.user!.id);
        if (ownId !== req.params.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
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
      if (!client || client.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }

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
          tenantId: req.params.tenantId,
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
      if (!minor || minor.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Dependent client profile not found", "CLIENT_NOT_FOUND");
      }

      return tx.guardianLink.create({
        data: {
          tenantId: req.params.tenantId,
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
      if (!target || target.tenantId !== req.params.tenantId) {
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
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
      }
      if (req.user!.role === "CLIENT" && target.guardianUserId !== req.user!.id) {
        throw new AppError(403, "Forbidden", "NOT_THE_GUARDIAN");
      }
      await tx.guardianLink.delete({ where: { id: req.params.linkId } });
    });
    res.status(204).send();
  }
);
