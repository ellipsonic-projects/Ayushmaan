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
import { writeAuditLog } from "../services/audit.service";
import { dispatchConsultantOnboarded } from "../services/notification.service";
import {
  applyTenantAvailabilityDefaults,
  generateDiscreteAvailability,
} from "../services/availability.service";
import {
  assertGuardianConsentIfMinor,
  assertNoConflict,
  assertNoOutOfOfficeConflict,
  createOrReuseCase,
} from "../services/booking.service";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { buildCaseContext } from "../lib/workflow-context";
import { phoneSchema } from "../lib/phone";

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
    const today = new Date();
    const consultants = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await tx.consultantProfile.findMany({
        where: {
          tenantId: req.params.tenantId,
          ...(req.user!.role === "CLIENT" && { isAcceptingNewClients: true }),
        },
        include: {
          user: { select: { email: true, accountStatus: true } },
          _count: { select: { cases: true } },
          outOfOfficePeriods: {
            where: { startDate: { lte: today }, endDate: { gte: today } },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (req.user!.role === "SUPER_ADMIN") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "SUPER_ADMIN",
          isCrossTenantAccess: true,
          action: "LIST_CONSULTANTS",
          entityType: "ConsultantProfile",
        });
      }

      return found;
    });
    res.json({ data: consultants });
  }
);

const createConsultantSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(1).max(200),
    phone: phoneSchema,
    category: z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
  })
  .strict();

// POST /tenants/:tenantId/consultants — invites a Consultant: creates users
// (role=CONSULTANT) + consultant_profiles. invitedBy is set server-side.
consultantsRouter.post(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
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

    const profile = await withTenantContext(req.tenantContext!, async (tx) => {
      const created = await tx.user.create({
        data: {
          supabaseAuthUserId: invited.user!.id,
          tenantId: req.params.tenantId,
          role: "CONSULTANT",
          email: body.email,
          phone: body.phone,
          emailIsVerified: !!invited.user.email_confirmed_at,
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
      });

      if (created.consultantProfile) {
        await applyTenantAvailabilityDefaults(
          tx,
          req.params.tenantId,
          created.consultantProfile.id
        );
      }

      if (req.user!.role === "SUPER_ADMIN") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "SUPER_ADMIN",
          isCrossTenantAccess: true,
          action: "CREATE",
          entityType: "ConsultantProfile",
          entityId: created.consultantProfile?.id,
        });
      }

      await enqueueEventTriggers(tx, req.params.tenantId, "CONSULTANT_ONBOARDED", {
        consultant: {
          id: created.consultantProfile!.id,
          fullName: body.fullName,
          category: body.category,
        },
      });

      return created;
    });

    await withTenantContext(req.tenantContext!, (tx) =>
      dispatchConsultantOnboarded(tx, {
        tenantId: req.params.tenantId,
        newConsultantName: body.fullName,
        excludeUserId: profile.id,
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
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      const found = await tx.consultantProfile.findUnique({
        where: { id: req.params.consultantId },
        include: {
          user: { select: { email: true, accountStatus: true } },
          _count: { select: { cases: true } },
        },
      });
      if (!found || found.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
      }

      if (req.user!.role === "SUPER_ADMIN") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "SUPER_ADMIN",
          isCrossTenantAccess: true,
          action: "READ",
          entityType: "ConsultantProfile",
          entityId: found.id,
        });
      }

      return found;
    });
    res.json({ data: consultant });
  }
);

const patchConsultantSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    category: z
      .enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"])
      .optional(),
    bio: z.string().optional(),
    consultationFee: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    timezone: z.string().min(1).max(50).optional(),
    languagesSpoken: z.array(z.string()).optional(),
    subSpecialization: z.string().max(150).optional(),
    isAcceptingNewClients: z.boolean().optional(),
    autoApproveBookings: z.boolean().optional(),
    paymentTiming: z.enum(["PAY_ON_BOOKING", "PAY_AFTER_SESSION"]).optional(),
    onboardingCompleted: z.boolean().optional(), // sets onboardingCompletedAt = now(); marks the post-elevation /complete-profile step done
  })
  .strict();

// PATCH /tenants/:tenantId/consultants/:consultantId — self, TENANT_ADMIN, SUPER_ADMIN.
consultantsRouter.patch(
  "/:consultantId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const { onboardingCompleted, ...updates } = patchConsultantSchema.parse(req.body);

    // Pricing is a TENANT_ADMIN decision — a consultant may edit every other
    // field on their own profile, but never their own consultationFee.
    if (req.user!.role === "CONSULTANT" && updates.consultationFee !== undefined) {
      throw new AppError(403, "Only a tenant admin can set the consultation fee", "FEE_ADMIN_ONLY");
    }

    const consultant = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      const updated = await tx.consultantProfile.update({
        where: { id: req.params.consultantId },
        data: {
          ...updates,
          ...(onboardingCompleted && { onboardingCompletedAt: new Date() }),
        },
      });

      if (req.user!.role === "SUPER_ADMIN") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "SUPER_ADMIN",
          isCrossTenantAccess: true,
          action: "UPDATE",
          entityType: "ConsultantProfile",
          entityId: req.params.consultantId,
        });
      }

      return updated;
    });

    res.json({ data: consultant });
  }
);

// DELETE /tenants/:tenantId/consultants/:consultantId — deactivates only
// (via the linked User's accountStatus; case history is never deleted —
// consultant_profiles itself carries no status column).
consultantsRouter.delete(
  "/:consultantId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const consultant = await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      await tx.user.update({
        where: { id: consultant.userId },
        data: { accountStatus: "SUSPENDED" },
      });

      if (req.user!.role === "SUPER_ADMIN") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "SUPER_ADMIN",
          isCrossTenantAccess: true,
          action: "DELETE",
          entityType: "ConsultantProfile",
          entityId: consultant.id,
        });
      }
    });
    res.status(204).send();
  }
);

const createConsultantAppointmentSchema = z
  .object({
    clientId: z.string().uuid(),
    caseMode: z.enum(["NEW", "EXISTING"]),
    caseId: z.string().uuid().optional(),
    category: z
      .enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"])
      .optional(),
    matterKey: z.string().max(150).optional(),
    scheduledStart: z.string(),
    scheduledEnd: z.string(),
    slotId: z.string().uuid().optional(),
  })
  .strict()
  .refine((b) => b.caseMode !== "EXISTING" || !!b.caseId, {
    message: "caseId is required when caseMode is EXISTING",
    path: ["caseId"],
  })
  .refine((b) => b.caseMode !== "NEW" || !!b.category, {
    message: "category is required when caseMode is NEW",
    path: ["category"],
  });

// POST /tenants/:tenantId/consultants/:consultantId/appointments — self only.
// instructions.md §1: consultant-initiated ad-hoc booking for an existing
// client, with an explicit new/existing case choice instead of the silent
// (client_id, consultant_id, category, matterKey) auto-match the public
// booking flow uses. Status defaults straight to APPROVED — the consultant
// creating this booking IS the confirmation, so there's no REQUESTED review
// stage the way there is for a client-initiated booking.
consultantsRouter.post(
  "/:consultantId/appointments",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createConsultantAppointmentSchema.parse(req.body);
    const scheduledStart = new Date(body.scheduledStart);
    const scheduledEnd = new Date(body.scheduledEnd);

    const appointment = await withTenantContext(req.tenantContext!, async (tx) => {
      const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!ownId || ownId !== req.params.consultantId) {
        throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");
      }

      const client = await tx.clientProfile.findUnique({ where: { id: body.clientId } });
      if (!client) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }

      let caseRow;
      if (body.caseMode === "EXISTING") {
        const existing = await tx.case.findUnique({ where: { id: body.caseId! } });
        if (
          !existing ||
          existing.tenantId !== req.params.tenantId ||
          existing.clientId !== body.clientId ||
          existing.consultantId !== ownId ||
          existing.status === "CLOSED" ||
          existing.deletedAt
        ) {
          throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        caseRow = existing;
      } else {
        const { case: created, isNew } = await createOrReuseCase(tx, {
          tenantId: req.params.tenantId,
          clientId: body.clientId,
          consultantId: ownId,
          category: body.category!,
          matterKey: body.matterKey,
          // "Start New Case" is an explicit choice made alongside an
          // explicit "Use this case" list of the client's ACTIVE cases —
          // never silently fold this into a case the consultant didn't
          // pick (e.g. one that's ON_HOLD/PENDING_ASSIGNMENT and so
          // wasn't shown in that list).
          dedupe: false,
        });
        caseRow = created;
        // The "new client" moment a consultant's workflow can hook a
        // SEND_INTAKE_FORM node onto via an EVENT trigger — see the
        // matching call in cases.router.ts's POST /.
        if (isNew) {
          await enqueueEventTriggers(
            tx,
            req.params.tenantId,
            "NEW_CLIENT",
            await buildCaseContext(tx, created.id)
          );
        }
      }

      await assertGuardianConsentIfMinor(tx, caseRow.clientId);

      if (body.slotId) {
        const slot = await tx.availabilitySlot.findUnique({ where: { id: body.slotId } });
        if (!slot || slot.tenantId !== req.params.tenantId || slot.consultantId !== ownId) {
          throw new AppError(404, "Slot not found", "SLOT_NOT_FOUND");
        }
        // Optimistic-lock the slot (same pattern as PATCH /availability-slots/:slotId)
        // instead of re-checking appointment-overlap conflicts below.
        const { count } = await tx.availabilitySlot.updateMany({
          where: { id: slot.id, version: slot.version, status: "OPEN" },
          data: { status: "BOOKED", version: { increment: 1 } },
        });
        if (count === 0) {
          throw new AppError(
            409,
            "Slot was booked elsewhere; refresh and retry",
            "SLOT_VERSION_CONFLICT"
          );
        }
      } else {
        await assertNoConflict(tx, { consultantId: ownId, scheduledStart, scheduledEnd });
      }
      await assertNoOutOfOfficeConflict(tx, { consultantId: ownId, scheduledStart });

      return tx.appointment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          scheduledStart,
          scheduledEnd,
          status: "APPROVED",
        },
      });
    });

    res.status(201).json({ data: appointment });
  }
);

// GET /tenants/:tenantId/consultants/:consultantId/verification-documents —
// self, TENANT_ADMIN. Display-only read; no platform approval workflow
// exists (schema §3.25).
consultantsRouter.get(
  "/:consultantId/verification-documents",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const documents = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
      }
      return tx.consultantVerificationDocument.findMany({
        where: { consultantId: req.params.consultantId },
      });
    });
    res.json({ data: documents });
  }
);

// GET /tenants/:tenantId/consultants/:consultantId/commitments — self only.
// Not in data_api_v4.md §14, which only defines per-case commitment reads
// (/cases/:caseId/commitments) — this aggregate mirrors the same
// spec-deviation precedent as appointmentsRouter's tenant-wide GET /, added
// because the consultant dashboard's "Critical Commitments" widget needs a
// single cross-case worklist rather than one request per case.
consultantsRouter.get(
  "/:consultantId/commitments",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const commitments = await withTenantContext(req.tenantContext!, async (tx) => {
      const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (ownId !== req.params.consultantId)
        throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");

      return tx.commitment.findMany({
        where: { status: "ACTIVE", case: { consultantId: req.params.consultantId } },
        include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
        orderBy: { createdAt: "asc" },
      });
    });
    res.json({ data: commitments });
  }
);

// GET /tenants/:tenantId/consultants/:consultantId/tasks — self only. Same
// spec-deviation precedent as the commitments aggregate above; data_api_v4.md
// §14 only defines /cases/:caseId/tasks.
consultantsRouter.get(
  "/:consultantId/tasks",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const tasks = await withTenantContext(req.tenantContext!, async (tx) => {
      const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (ownId !== req.params.consultantId)
        throw new AppError(403, "Forbidden", "NOT_OWN_PROFILE");

      return tx.task.findMany({
        where: {
          assignedTo: "CONSULTANT",
          status: { in: ["OPEN", "OVERDUE"] },
          case: { consultantId: req.params.consultantId },
        },
        include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
        orderBy: { dueAt: { sort: "asc", nulls: "last" } },
      });
    });
    res.json({ data: tasks });
  }
);

// data_api_v4.md §8 puts this route at
// /tenants/:tenantId/verification-documents/:docId, a sibling of
// /consultants rather than nested under it — exported separately so
// index.ts can mount it at the matching path.
export const verificationDocumentsRouter: Router = Router({ mergeParams: true });
verificationDocumentsRouter.use(requireTenantMatch);

// DELETE /tenants/:tenantId/verification-documents/:docId — self, TENANT_ADMIN.
verificationDocumentsRouter.delete(
  "/:docId",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const doc = await tx.consultantVerificationDocument.findUnique({
        where: { id: req.params.docId },
      });
      if (!doc || doc.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, doc.consultantId);
      }
      await tx.consultantVerificationDocument.delete({ where: { id: req.params.docId } });
    });
    res.status(204).send();
  }
);

const availabilityQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const CLIENT_AVAILABILITY_WINDOW_DAYS = 90;

// GET /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN see every raw template row regardless of status, for the
// admin "manage availability" UI that edits/deletes by slotId, plus
// `clientVisibleSlots`: the same discrete bookable instants a CLIENT would
// see, so a consultant/admin preview never drifts from what book-page shows.
// CLIENT (book-page slot picker) gets only the discrete list as `data` —
// every instant stepped from each template's startTime..endTime by
// slotDurationMins, across [from, to] (defaulting to today..+90d), with
// instances inside the tenant's booking_cutoff_hours window or overlapping
// an existing appointment already excluded server-side
// (generateDiscreteAvailability).
consultantsRouter.get(
  "/:consultantId/availability",
  requireRole("CONSULTANT", "TENANT_ADMIN", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = availabilityQuerySchema.parse(req.query);

    const { slots, clientVisibleSlots } = await withTenantContext(
      req.tenantContext!,
      async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user!.role === "CONSULTANT") {
          const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
          assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        const isClient = req.user!.role === "CLIENT";

        const from = query.from
          ? new Date(query.from)
          : new Date(new Date().toISOString().slice(0, 10));
        const to = query.to
          ? new Date(query.to)
          : new Date(from.getTime() + CLIENT_AVAILABILITY_WINDOW_DAYS * 86_400_000);

        const found = await tx.availabilitySlot.findMany({
          where: {
            consultantId: req.params.consultantId,
            ...(isClient && { status: "OPEN" }),
            ...(isClient
              ? { OR: [{ specificDate: null }, { specificDate: { gte: from, lte: to } }] }
              : (query.from || query.to) && {
                  specificDate: {
                    ...(query.from && { gte: new Date(query.from) }),
                    ...(query.to && { lte: new Date(query.to) }),
                  },
                }),
          },
        });

        const settings = await tx.tenantSettings.findUnique({
          where: { tenantId: req.params.tenantId },
          select: { bookingCutoffHours: true },
        });
        const cutoffMs = (settings?.bookingCutoffHours ?? 2) * 60 * 60 * 1000;

        const appointments = await tx.appointment.findMany({
          where: {
            status: { notIn: ["CANCELLED"] },
            scheduledStart: { lt: to },
            scheduledEnd: { gt: from },
            case: { consultantId: req.params.consultantId },
          },
          select: { scheduledStart: true, scheduledEnd: true },
        });

        if (isClient) {
          const discrete = generateDiscreteAvailability(
            found,
            appointments,
            from,
            to,
            cutoffMs,
            Date.now()
          );
          return { slots: discrete, clientVisibleSlots: discrete };
        }

        // Non-client roles still see the discrete list a client would get —
        // computed from the OPEN subset of `found` — alongside every raw
        // template row (`found`) used to render/edit "Weekly Hours".
        const discrete = generateDiscreteAvailability(
          found.filter((s) => s.status === "OPEN"),
          appointments,
          from,
          to,
          cutoffMs,
          Date.now()
        );
        return { slots: found, clientVisibleSlots: discrete };
      }
    );

    res.json({ data: slots, clientVisibleSlots });
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

    // Recurring (dayOfWeek) hours are the tenant admin's call — a consultant
    // may still add one-off specificDate overrides here.
    if (req.user!.role === "CONSULTANT" && inputs.some((input) => "dayOfWeek" in input)) {
      throw new AppError(
        403,
        "Only a tenant admin can set recurring weekly hours",
        "RECURRING_SLOT_ADMIN_ONLY"
      );
    }

    const slots = await withTenantContext(req.tenantContext!, async (tx) => {
      await findConsultant(tx, req.params.tenantId, req.params.consultantId);
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);

        // A consultant may only override hours the tenant admin's recurring
        // defaults already established — a specificDate window must fall
        // entirely inside an existing dayOfWeek slot for that date's weekday.
        const recurringSlots = await tx.availabilitySlot.findMany({
          where: { consultantId: req.params.consultantId, dayOfWeek: { not: null } },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        });
        for (const input of inputs) {
          if (!("specificDate" in input)) continue;
          const weekday = new Date(`${input.specificDate}T00:00:00Z`).getUTCDay();
          const start = new Date(`1970-01-01T${input.startTime}:00Z`);
          const end = new Date(`1970-01-01T${input.endTime}:00Z`);
          const withinExistingHours = recurringSlots.some(
            (slot) =>
              slot.dayOfWeek === weekday &&
              start.getTime() >= slot.startTime.getTime() &&
              end.getTime() <= slot.endTime.getTime()
          );
          if (!withinExistingHours) {
            throw new AppError(
              403,
              "Overrides may only fall within your existing availability hours",
              "OVERRIDE_OUTSIDE_DEFAULT_HOURS"
            );
          }
        }
      }
      return Promise.all(
        inputs.map((input) =>
          tx.availabilitySlot.create({
            data: {
              tenantId: req.params.tenantId,
              consultantId: req.params.consultantId,
              dayOfWeek: "dayOfWeek" in input ? input.dayOfWeek : undefined,
              specificDate: "specificDate" in input ? new Date(input.specificDate) : undefined,
              startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
              endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
              slotDurationMins: input.slotDurationMins ?? 30,
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
    version: z.number().int().min(1).optional(),
    // Required when a CONSULTANT overrides a slot the admin owns — recorded
    // to the audit log rather than a column, since AvailabilitySlot itself
    // carries no reason field.
    reason: z.string().min(1).max(500).optional(),
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
    if (req.user!.role === "CONSULTANT" && !body.reason) {
      throw new AppError(
        400,
        "A reason is required to override this slot",
        "OVERRIDE_REASON_REQUIRED"
      );
    }
    const slot = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Slot not found", "SLOT_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const ownId = await getOwnConsultantProfileId(tx, req.user!.id);
        assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
      }
      if (body.version !== undefined && body.version !== target.version) {
        throw new AppError(
          409,
          "Slot was modified elsewhere; refresh and retry",
          "SLOT_VERSION_CONFLICT"
        );
      }
      const updated = await tx.availabilitySlot.update({
        where: { id: req.params.slotId },
        data: {
          ...(body.startTime && { startTime: new Date(`1970-01-01T${body.startTime}:00Z`) }),
          ...(body.endTime && { endTime: new Date(`1970-01-01T${body.endTime}:00Z`) }),
          ...(body.status && { status: body.status }),
          version: { increment: 1 },
        },
      });

      if (req.user!.role === "CONSULTANT") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "CONSULTANT",
          isCrossTenantAccess: false,
          action: "UPDATE",
          entityType: "AvailabilitySlot",
          entityId: target.id,
          reason: body.reason,
        });
      }

      return updated;
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
    const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
    if (req.user!.role === "CONSULTANT" && !reason) {
      throw new AppError(
        400,
        "A reason is required to override this slot",
        "OVERRIDE_REASON_REQUIRED"
      );
    }
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

      if (req.user!.role === "CONSULTANT") {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "CONSULTANT",
          isCrossTenantAccess: false,
          action: "DELETE",
          entityType: "AvailabilitySlot",
          entityId: target.id,
          reason,
        });
      }
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

const availabilityDefaultSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    slotDurationMins: z.number().int().min(5).optional(),
  })
  .strict();
const setAvailabilityDefaultsBodySchema = z.array(availabilityDefaultSchema);

// A sibling of /consultants (same reasoning as availabilitySlotsRouter and
// outOfOfficeRouter above) mounted at /tenants/:tenantId/availability-defaults.
export const availabilityDefaultsRouter: Router = Router({ mergeParams: true });
availabilityDefaultsRouter.use(requireTenantMatch);

// GET /tenants/:tenantId/availability-defaults — TENANT_ADMIN, SUPER_ADMIN.
// Returns the tenant's current recurring weekly window so Settings can
// hydrate its form instead of falling back to hardcoded defaults.
availabilityDefaultsRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const defaults = await withTenantContext(req.tenantContext!, (tx) =>
      tx.tenantAvailabilityDefault.findMany({ where: { tenantId: req.params.tenantId } })
    );

    res.json({
      data: defaults.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime.toISOString().slice(11, 16),
        endTime: d.endTime.toISOString().slice(11, 16),
        slotDurationMins: d.slotDurationMins,
      })),
    });
  }
);

// PUT /tenants/:tenantId/availability-defaults — TENANT_ADMIN, SUPER_ADMIN.
// Replaces the tenant's recurring weekly window ("Weekly Recurring Time" in
// Settings) and applies it to every consultant currently in the tenant,
// skipping any consultant who already has a matching slot. Consultants
// onboarded afterward get it automatically via applyTenantAvailabilityDefaults
// in the consultant-creation/approval routes, so admins never need to
// replay this beyond backfilling consultants who joined before this existed.
availabilityDefaultsRouter.put(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = setAvailabilityDefaultsBodySchema.parse(req.body);

    const defaults = await withTenantContext(req.tenantContext!, async (tx) => {
      await tx.tenantAvailabilityDefault.deleteMany({ where: { tenantId: req.params.tenantId } });
      const created = await Promise.all(
        body.map((input) =>
          tx.tenantAvailabilityDefault.create({
            data: {
              tenantId: req.params.tenantId,
              dayOfWeek: input.dayOfWeek,
              // Append Z so the string is parsed as UTC, matching how Prisma
              // returns @db.Time columns (always UTC midnight + offset).
              startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
              endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
              // Use explicit assignment (not truthy shorthand) so the value is
              // always written to the DB, enabling exact comparison in
              // applyTenantAvailabilityDefaults.
              slotDurationMins: input.slotDurationMins ?? 30,
            },
          })
        )
      );

      const consultants = await tx.consultantProfile.findMany({
        where: { tenantId: req.params.tenantId },
        select: { id: true },
      });
      for (const consultant of consultants) {
        await applyTenantAvailabilityDefaults(tx, req.params.tenantId, consultant.id);
      }

      return created;
    });

    res.json({ data: defaults });
  }
);
