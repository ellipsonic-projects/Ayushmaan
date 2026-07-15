import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnConsultantProfileId } from "../lib/callerProfile";

// data_api_v4.md §8 — consultant_profiles, availability_slots,
// out_of_office_periods. Mounted at /api/tenants/:tenantId/consultants.
export const consultantsRouter: Router = Router({ mergeParams: true });
consultantsRouter.use(requireTenantMatch);

// GET /tenants/:tenantId/consultants — CLIENT sees only consultants
// currently accepting new clients (booking-relevant); TENANT_ADMIN,
// SUPER_ADMIN and CONSULTANT see the full tenant roster.
consultantsRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const consultants = await withTenantContext(req.tenantContext!, (tx) =>
      tx.consultantProfile.findMany({
        where: {
          tenantId: req.params.tenantId,
          ...(req.user!.role === "CLIENT" && { isAcceptingNewClients: true }),
        },
      })
    );
    res.json({ data: consultants });
  }
);

const createConsultantSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(1).max(200),
    category: z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
  })
  .strict();

// POST /tenants/:tenantId/consultants — invites a Consultant: creates users
// (role=CONSULTANT) + consultant_profiles. invitedBy is set server-side.
consultantsRouter.post(
  "/",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createConsultantSchema.parse(req.body);

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email
    );
    if (inviteError || !invited.user) {
      throw new AppError(
        502,
        `Failed to invite consultant: ${inviteError?.message ?? "unknown error"}`,
        "INVITE_FAILED"
      );
    }

    const profile = await withTenantContext(req.tenantContext!, (tx) =>
      tx.user.create({
        data: {
          supabaseAuthUserId: invited.user!.id,
          tenantId: req.params.tenantId,
          role: "CONSULTANT",
          email: body.email,
          consultantProfile: {
            create: {
              tenantId: req.params.tenantId,
              fullName: body.fullName,
              category: body.category,
              invitedBy: req.user!.id,
            },
          },
        },
        include: { consultantProfile: true },
      })
    );

    res.status(201).json({ data: profile });
  }
);

async function findConsultant(
  tx: Prisma.TransactionClient,
  tenantId: string,
  consultantId: string
) {
  const consultant = await tx.consultantProfile.findUnique({ where: { id: consultantId } });
  if (!consultant || consultant.tenantId !== tenantId) {
    throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
  }
  return consultant;
}

function assertSelfMatchesOrAdmin(
  req: TenantScopedRequest,
  ownConsultantId: string | null,
  consultantId: string
) {
  if (req.user!.role === "TENANT_ADMIN" || req.user!.role === "SUPER_ADMIN") return;
  if (ownConsultantId !== consultantId) throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
}

// GET /tenants/:tenantId/consultants/:consultantId
consultantsRouter.get(
  "/:consultantId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const consultant = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return found;
    });
    res.json({ data: consultant });
  }
);

const patchConsultantSchema = z
  .object({
    bio: z.string().optional(),
    consultationFee: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    languagesSpoken: z.array(z.string()).optional(),
    subSpecialization: z.string().max(150).optional(),
    isAcceptingNewClients: z.boolean().optional(),
    autoApproveBookings: z.boolean().optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/consultants/:consultantId — self, TENANT_ADMIN.
consultantsRouter.patch(
  "/:consultantId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const updates = patchConsultantSchema.parse(req.body);

    const consultant = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return tx.consultantProfile.update({ where: { id: req.params.consultantId }, data: updates });
    });

    res.json({ data: consultant });
  }
);

// DELETE /tenants/:tenantId/consultants/:consultantId — deactivates only
// (via the linked User's accountStatus; case history is never deleted —
// consultant_profiles itself carries no status column).
consultantsRouter.delete(
  "/:consultantId",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const consultant = await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      await tx.user.update({
        where: { id: consultant.userId },
        data: { accountStatus: "SUSPENDED" },
      });
    });
    res.status(204).send();
  }
);

const availabilityQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

// GET /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN (all fields); public open-slot projection is handled by a
// separate unauthenticated route (data_api_v4.md §9), not this one.
consultantsRouter.get(
  "/:consultantId/availability",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = availabilityQuerySchema.parse(req.query);

    const slots = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return tx.availabilitySlot.findMany({
        where: {
          consultantId: req.params.consultantId,
          ...((query.from || query.to) && {
            specificDate: {
              ...(query.from && { gte: new Date(query.from) }),
              ...(query.to && { lte: new Date(query.to) }),
            },
          }),
        },
      });
    });

    res.json({ data: slots });
  }
);

const createSlotSchema = z.union([
  z
    .object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      slotDurationMins: z.number().int().min(5).optional(),
    })
    .strict(),
  z
    .object({
      specificDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      slotDurationMins: z.number().int().min(5).optional(),
    })
    .strict(),
]);
const createSlotsBodySchema = z.union([createSlotSchema, z.array(createSlotSchema)]);

// POST /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN. Supports a bulk array body ("block this week").
consultantsRouter.post(
  "/:consultantId/availability",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createSlotsBodySchema.parse(req.body);
    const inputs = Array.isArray(body) ? body : [body];

    const slots = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return Promise.all(
        inputs.map((input) =>
          tx.availabilitySlot.create({
            data: {
              tenantId: req.params.tenantId,
              consultantId: req.params.consultantId,
              dayOfWeek: "dayOfWeek" in input ? input.dayOfWeek : undefined,
              specificDate: "specificDate" in input ? new Date(input.specificDate) : undefined,
              startTime: new Date(`1970-01-01T${input.startTime}`),
              endTime: new Date(`1970-01-01T${input.endTime}`),
              ...(input.slotDurationMins && { slotDurationMins: input.slotDurationMins }),
            },
          })
        )
      );
    });

    res.status(201).json({ data: slots });
  }
);

const patchSlotSchema = z
  .object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    status: z.enum(["OPEN", "BOOKED", "BLOCKED"]).optional(),
  })
  .strict();

// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/availability-slots/:slotId, a sibling of /consultants
// rather than nested under it — exported separately so index.ts can mount
// it at the matching path.
export const availabilitySlotsRouter: Router = Router({ mergeParams: true });
availabilitySlotsRouter.use(requireTenantMatch);

// PATCH /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
availabilitySlotsRouter.patch(
  "/:slotId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchSlotSchema.parse(req.body);
    const slot = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Slot not found", "SLOT_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
      }
      return tx.availabilitySlot.update({
        where: { id: req.params.slotId },
        data: {
          ...(body.startTime && { startTime: new Date(`1970-01-01T${body.startTime}`) }),
          ...(body.endTime && { endTime: new Date(`1970-01-01T${body.endTime}`) }),
          ...(body.status && { status: body.status }),
          version: { increment: 1 },
        },
      });
    });
    res.json({ data: slot });
  }
);

// DELETE /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
// Blocked with 409 if BOOKED unless ?force=true.
availabilitySlotsRouter.delete(
  "/:slotId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const force = req.query.force === "true";
    await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Slot not found", "SLOT_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
      }
      if (target.status === "BOOKED" && !force) {
        throw new AppError(409, "Slot is booked; pass ?force=true to override", "SLOT_BOOKED");
      }
      await tx.availabilitySlot.delete({ where: { id: req.params.slotId } });
    });
    res.status(204).send();
  }
);

// GET /tenants/:tenantId/consultants/:consultantId/out-of-office
consultantsRouter.get(
  "/:consultantId/out-of-office",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const periods = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return tx.outOfOfficePeriod.findMany({ where: { consultantId: req.params.consultantId } });
    });
    res.json({ data: periods });
  }
);

const createOooSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
    autoReplyMessage: z.string().optional(),
    pausesNewBookings: z.boolean().optional(),
  })
  .strict();

// POST /tenants/:tenantId/consultants/:consultantId/out-of-office
consultantsRouter.post(
  "/:consultantId/out-of-office",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createOooSchema.parse(req.body);

    const period = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return tx.outOfOfficePeriod.create({
        data: {
          tenantId: req.params.tenantId,
          consultantId: req.params.consultantId,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          autoReplyMessage: body.autoReplyMessage,
          ...(body.pausesNewBookings !== undefined && {
            pausesNewBookings: body.pausesNewBookings,
          }),
        },
      });
    });

    res.status(201).json({ data: period });
  }
);

const patchOooSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    autoReplyMessage: z.string().optional(),
    pausesNewBookings: z.boolean().optional(),
  })
  .strict();

async function findOoo(tx: Prisma.TransactionClient, tenantId: string, oooId: string) {
  const period = await tx.outOfOfficePeriod.findUnique({ where: { id: oooId } });
  if (!period || period.tenantId !== tenantId) {
    throw new AppError(404, "Out-of-office period not found", "OOO_NOT_FOUND");
  }
  return period;
}

// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/out-of-office/:oooId, a sibling of /consultants rather
// than nested under it — exported separately so index.ts can mount it at
// the matching path.
export const outOfOfficeRouter: Router = Router({ mergeParams: true });
outOfOfficeRouter.use(requireTenantMatch);

// PATCH /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
outOfOfficeRouter.patch(
  "/:oooId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchOooSchema.parse(req.body);
    const period = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
      }
      return tx.outOfOfficePeriod.update({
        where: { id: req.params.oooId },
        data: {
          ...(body.startDate && { startDate: new Date(body.startDate) }),
          ...(body.endDate && { endDate: new Date(body.endDate) }),
          ...(body.autoReplyMessage !== undefined && { autoReplyMessage: body.autoReplyMessage }),
          ...(body.pausesNewBookings !== undefined && {
            pausesNewBookings: body.pausesNewBookings,
          }),
        },
      });
    });
    res.json({ data: period });
  }
);

// DELETE /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
outOfOfficeRouter.delete(
  "/:oooId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
      }
      await tx.outOfOfficePeriod.delete({ where: { id: req.params.oooId } });
    });
    res.status(204).send();
  }
);
