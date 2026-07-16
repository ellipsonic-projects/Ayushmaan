import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnClientProfileId, getOwnConsultantProfileId } from "../lib/callerProfile";
import { assertNoConflict, expandOccurrences, RecurrenceRule } from "../services/booking.service";
import { writeAuditLog } from "../services/audit.service";

// data_api_v4.md §11 — appointment_series, appointments. Two-stage approval:
// REQUESTED -> (TENANT_ADMIN) ADMIN_APPROVED/RESCHEDULE_PROPOSED/CANCELLED
// -> (CONSULTANT) APPROVED -> COMPLETED/CANCELLED/NO_SHOW. Only TENANT_ADMIN
// can ever cancel/reject; a CONSULTANT who doesn't want an ADMIN_APPROVED
// appointment transfers the case to a peer via POST /cases/:caseId/reassign
// instead of rejecting it.

async function loadCaseForBooking(tx: Prisma.TransactionClient, tenantId: string, caseId: string) {
  const found = await tx.case.findUnique({ where: { id: caseId } });
  if (!found || found.tenantId !== tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }
  return found;
}

async function assertCaseParty(
  tx: Prisma.TransactionClient,
  req: TenantScopedRequest,
  caseRow: { consultantId: string | null; clientId: string }
) {
  if (req.user!.role === "TENANT_ADMIN" || req.user!.role === "SUPER_ADMIN") {
    return; // tenant-scoped via requireTenantMatch + RLS, not tied to case ownership.
  }
  if (req.user!.role === "CONSULTANT") {
    const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
    if (consultantId !== caseRow.consultantId) throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
    return;
  }
  if (req.user!.role === "CLIENT") {
    const clientId = await getOwnClientProfileId(tx, req.user!.id);
    if (clientId !== caseRow.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
    return;
  }
  throw new AppError(403, "Forbidden", "ROLE_FORBIDDEN");
}

async function resolveAutoApprove(
  tx: Prisma.TransactionClient,
  tenantId: string,
  consultantId: string
) {
  const [consultant, settings] = await Promise.all([
    tx.consultantProfile.findUnique({
      where: { id: consultantId },
      select: { autoApproveBookings: true },
    }),
    tx.tenantSettings.findUnique({ where: { tenantId }, select: { autoApproveBookings: true } }),
  ]);
  return consultant?.autoApproveBookings || settings?.autoApproveBookings || false;
}

// Mounted at /api/tenants/:tenantId/cases/:caseId/appointments.
export const caseAppointmentsRouter: Router = Router({ mergeParams: true });
caseAppointmentsRouter.use(requireTenantMatch);

// GET /tenants/:tenantId/cases/:caseId/appointments
caseAppointmentsRouter.get(
  "/",
  requireRole("CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const appointments = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
      await assertCaseParty(tx, req, caseRow);
      return tx.appointment.findMany({
        where: { caseId: req.params.caseId },
        orderBy: { scheduledStart: "desc" },
      });
    });
    res.json({ data: appointments });
  }
);

const createAppointmentSchema = z
  .object({
    scheduledStart: z.string(),
    scheduledEnd: z.string(),
    meetingLink: z.string().url().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/appointments — single-occurrence
// booking. Conflict-checked against existing appointments; 409 on double-book.
// TENANT_ADMIN may book directly on a client's behalf against an existing
// case — that appointment starts ADMIN_APPROVED (the admin creating it IS
// the admin-review stage) instead of REQUESTED, and is audit-logged.
caseAppointmentsRouter.post(
  "/",
  requireRole("CLIENT", "CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createAppointmentSchema.parse(req.body);
    const scheduledStart = new Date(body.scheduledStart);
    const scheduledEnd = new Date(body.scheduledEnd);

    const appointment = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
      if (!caseRow.consultantId) {
        throw new AppError(
          409,
          "This case has no consultant assigned yet",
          "CASE_PENDING_ASSIGNMENT"
        );
      }
      const consultantId = caseRow.consultantId;
      await assertCaseParty(tx, req, caseRow);
      await assertNoConflict(tx, {
        consultantId,
        scheduledStart,
        scheduledEnd,
      });

      const autoApprove = await resolveAutoApprove(tx, req.params.tenantId, consultantId);
      const isAdminCreated = req.user!.role === "TENANT_ADMIN";

      const created = await tx.appointment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: req.params.caseId,
          scheduledStart,
          scheduledEnd,
          meetingLink: body.meetingLink,
          status: autoApprove ? "APPROVED" : isAdminCreated ? "ADMIN_APPROVED" : "REQUESTED",
        },
      });

      if (isAdminCreated) {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: "TENANT_ADMIN",
          isCrossTenantAccess: false,
          action: "CREATE_APPOINTMENT",
          entityType: "appointment",
          entityId: created.id,
        });
      }

      return created;
    });

    res.status(201).json({ data: appointment });
  }
);

const createSeriesSchema = z
  .object({
    recurrenceRule: z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      durationMins: z.number().int().min(5),
      startDate: z.string(),
      endDate: z.string().optional(),
      occurrenceCount: z.number().int().min(1).optional(),
    }),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/appointment-series — recurring
// booking. Creates appointment_series + expands appointments atomically.
// data_api_v4.md's path for series creation is a sibling of /appointments
// under the same /cases/:caseId parent — exported separately since it
// can't share caseAppointmentsRouter's own base path.
export const caseAppointmentSeriesRouter: Router = Router({ mergeParams: true });
caseAppointmentSeriesRouter.use(requireTenantMatch);

caseAppointmentSeriesRouter.post(
  "/",
  requireRole("CLIENT", "CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createSeriesSchema.parse(req.body);
    const rule: RecurrenceRule = body.recurrenceRule;
    const occurrences = expandOccurrences(rule);
    if (occurrences.length === 0) {
      throw new AppError(400, "recurrenceRule produced no occurrences", "EMPTY_SERIES");
    }

    const series = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForBooking(tx, req.params.tenantId, req.params.caseId);
      if (!caseRow.consultantId) {
        throw new AppError(
          409,
          "This case has no consultant assigned yet",
          "CASE_PENDING_ASSIGNMENT"
        );
      }
      const consultantId = caseRow.consultantId;
      await assertCaseParty(tx, req, caseRow);

      for (const occ of occurrences) {
        await assertNoConflict(tx, {
          consultantId,
          scheduledStart: occ.start,
          scheduledEnd: occ.end,
        });
      }

      const autoApprove = await resolveAutoApprove(tx, req.params.tenantId, consultantId);
      const status = autoApprove ? "APPROVED" : "REQUESTED";

      return tx.appointmentSeries.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: req.params.caseId,
          recurrenceRule: rule as any,
          appointments: {
            create: occurrences.map((occ) => ({
              tenantId: req.params.tenantId,
              caseId: req.params.caseId,
              scheduledStart: occ.start,
              scheduledEnd: occ.end,
              status,
            })),
          },
        },
        include: { appointments: true },
      });
    });

    res.status(201).json({ data: series });
  }
);

// Mounted at /api/tenants/:tenantId/appointment-series.
export const appointmentSeriesRouter: Router = Router({ mergeParams: true });
appointmentSeriesRouter.use(requireTenantMatch);

async function loadSeries(tx: Prisma.TransactionClient, tenantId: string, seriesId: string) {
  const found = await tx.appointmentSeries.findUnique({
    where: { id: seriesId },
    include: { case: true, appointments: true },
  });
  if (!found || found.tenantId !== tenantId) {
    throw new AppError(404, "Appointment series not found", "SERIES_NOT_FOUND");
  }
  return found;
}

// GET /tenants/:tenantId/appointment-series/:seriesId
appointmentSeriesRouter.get(
  "/:seriesId",
  requireRole("CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const series = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await loadSeries(tx, req.params.tenantId, req.params.seriesId);
      await assertCaseParty(tx, req, found.case);
      return found;
    });
    res.json({ data: series });
  }
);

const patchSeriesSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
  })
  .strict();

// PATCH /tenants/:tenantId/appointment-series/:seriesId — CONSULTANT (own).
// Cancelling cascades only to future REQUESTED/APPROVED occurrences.
appointmentSeriesRouter.patch(
  "/:seriesId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchSeriesSchema.parse(req.body);

    const series = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await loadSeries(tx, req.params.tenantId, req.params.seriesId);
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (consultantId !== found.case.consultantId)
        throw new AppError(403, "Forbidden", "NOT_OWN_CASE");

      const updated = await tx.appointmentSeries.update({
        where: { id: req.params.seriesId },
        data: { status: body.status },
      });

      if (body.status === "CANCELLED") {
        await tx.appointment.updateMany({
          where: {
            seriesId: req.params.seriesId,
            scheduledStart: { gt: new Date() },
            status: { in: ["REQUESTED", "APPROVED"] },
          },
          data: { status: "CANCELLED" },
        });
      }

      return updated;
    });

    res.json({ data: series });
  }
);

// Mounted at /api/tenants/:tenantId/appointments.
export const appointmentsRouter: Router = Router({ mergeParams: true });
appointmentsRouter.use(requireTenantMatch);

const listAppointmentsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z
    .enum([
      "REQUESTED",
      "ADMIN_APPROVED",
      "APPROVED",
      "RESCHEDULE_PROPOSED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
});

// GET /tenants/:tenantId/appointments — tenant-wide list, TENANT_ADMIN (all)
// or CONSULTANT (own only, scoped via case.consultantId below). CLIENT still
// uses the per-case route instead. Not in data_api_v4.md §11 yet — added to
// back the admin dashboard's "today's appointments", "pending approvals" and
// revenue KPIs, which had no tenant-scoped read path before this; widened to
// CONSULTANT for the same reason on the consultant dashboard.
appointmentsRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listAppointmentsQuerySchema.parse(req.query);

    const appointments = await withTenantContext(req.tenantContext!, async (tx) => {
      let consultantId: string | undefined;
      if (req.user!.role === "CONSULTANT") {
        consultantId = (await getOwnConsultantProfileId(tx, req.user!.id)) ?? undefined;
        if (!consultantId) return [];
      }

      return tx.appointment.findMany({
        where: {
          tenantId: req.params.tenantId,
          ...(query.status && { status: query.status }),
          ...((query.from || query.to) && {
            scheduledStart: {
              ...(query.from && { gte: new Date(query.from) }),
              ...(query.to && { lte: new Date(query.to) }),
            },
          }),
          ...(consultantId && { case: { consultantId } }),
        },
        include: {
          case: {
            select: {
              id: true,
              status: true,
              category: true,
              client: { select: { id: true, fullName: true } },
              consultant: {
                select: {
                  id: true,
                  fullName: true,
                  category: true,
                  consultationFee: true,
                  currency: true,
                },
              },
            },
          },
          payments: { select: { amount: true, status: true, createdAt: true } },
        },
        orderBy: { scheduledStart: "asc" },
      });
    });

    res.json({ data: appointments });
  }
);

async function loadAppointment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  appointmentId: string
) {
  const found = await tx.appointment.findUnique({
    where: { id: appointmentId },
    include: { case: true },
  });
  if (!found || found.tenantId !== tenantId) {
    throw new AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }
  return found;
}

// GET /tenants/:tenantId/appointments/:appointmentId
appointmentsRouter.get(
  "/:appointmentId",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const appointment = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await loadAppointment(tx, req.params.tenantId, req.params.appointmentId);
      await assertCaseParty(tx, req, found.case);
      return found;
    });
    res.json({ data: appointment });
  }
);

// data_api_v4.md §11 — legal transitions per role AND current status. Only
// TENANT_ADMIN can ever reject/cancel; a CONSULTANT who doesn't want an
// ADMIN_APPROVED appointment transfers the case to a peer consultant via
// POST /cases/:caseId/reassign instead — there is no CONSULTANT->CANCELLED
// path here. COMPLETED/CANCELLED/NO_SHOW are terminal; an illegal
// transition (wrong status, wrong role, or both) is 422.
const TRANSITIONS_BY_ROLE: Record<string, Record<string, string[]>> = {
  TENANT_ADMIN: {
    REQUESTED: ["ADMIN_APPROVED", "RESCHEDULE_PROPOSED", "CANCELLED"],
    ADMIN_APPROVED: ["CANCELLED"],
    RESCHEDULE_PROPOSED: ["CANCELLED"],
    APPROVED: ["CANCELLED"],
  },
  SUPER_ADMIN: {
    REQUESTED: ["ADMIN_APPROVED", "RESCHEDULE_PROPOSED", "CANCELLED"],
    ADMIN_APPROVED: ["CANCELLED"],
    RESCHEDULE_PROPOSED: ["CANCELLED"],
    APPROVED: ["CANCELLED"],
  },
  CONSULTANT: {
    ADMIN_APPROVED: ["APPROVED"],
    APPROVED: ["COMPLETED", "NO_SHOW"],
  },
  CLIENT: {
    RESCHEDULE_PROPOSED: ["ADMIN_APPROVED", "CANCELLED"],
    REQUESTED: ["CANCELLED"],
    APPROVED: ["CANCELLED"],
  },
};

const ADMIN_ACTION_BY_TARGET_STATUS: Record<string, string> = {
  ADMIN_APPROVED: "APPROVE_APPOINTMENT",
  RESCHEDULE_PROPOSED: "PROPOSE_RESCHEDULE",
  CANCELLED: "REJECT_APPOINTMENT",
};

const patchAppointmentSchema = z
  .object({
    status: z
      .enum([
        "REQUESTED",
        "ADMIN_APPROVED",
        "APPROVED",
        "RESCHEDULE_PROPOSED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ])
      .optional(),
    meetingLink: z.string().url().optional(),
    cancellationReason: z.string().optional(),
    scheduledStart: z.string().optional(),
    scheduledEnd: z.string().optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/appointments/:appointmentId — appointment
// state-machine transitions. TENANT_ADMIN: admin-approve/propose-reschedule/
// reject a REQUESTED appointment, or cancel at any later stage — the only
// role that can ever cancel/reject. CONSULTANT: accept an ADMIN_APPROVED
// appointment, mark complete/no-show/videoLink on an APPROVED one. CLIENT:
// accept/decline a Tenant-Admin-proposed reschedule, cancel within cutoff —
// never videoLink or NO_SHOW.
appointmentsRouter.patch(
  "/:appointmentId",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchAppointmentSchema.parse(req.body);

    if (req.user!.role === "CLIENT" && (body.meetingLink || body.status === "NO_SHOW")) {
      throw new AppError(403, "A Client cannot set videoLink or mark NO_SHOW", "ROLE_FORBIDDEN");
    }

    const appointment = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await loadAppointment(tx, req.params.tenantId, req.params.appointmentId);
      await assertCaseParty(tx, req, found.case);

      if (body.status) {
        const allowed = TRANSITIONS_BY_ROLE[req.user!.role]?.[found.status] ?? [];
        if (!allowed.includes(body.status)) {
          throw new AppError(
            422,
            `Cannot transition an appointment from ${found.status} to ${body.status}`,
            "ILLEGAL_TRANSITION"
          );
        }
      }

      if ((body.scheduledStart || body.scheduledEnd) && found.case.consultantId) {
        await assertNoConflict(tx, {
          consultantId: found.case.consultantId,
          scheduledStart: body.scheduledStart
            ? new Date(body.scheduledStart)
            : found.scheduledStart,
          scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : found.scheduledEnd,
          excludeAppointmentId: found.id,
        });
      }

      const updated = await tx.appointment.update({
        where: { id: req.params.appointmentId },
        data: {
          ...(body.status && { status: body.status }),
          ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink }),
          ...(body.cancellationReason !== undefined && {
            cancellationReason: body.cancellationReason,
          }),
          ...(body.scheduledStart && { scheduledStart: new Date(body.scheduledStart) }),
          ...(body.scheduledEnd && { scheduledEnd: new Date(body.scheduledEnd) }),
        },
      });

      if ((req.user!.role === "TENANT_ADMIN" || req.user!.role === "SUPER_ADMIN") && body.status) {
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: req.user!.role,
          isCrossTenantAccess: req.user!.role === "SUPER_ADMIN",
          action: ADMIN_ACTION_BY_TARGET_STATUS[body.status] ?? "UPDATE_APPOINTMENT",
          entityType: "appointment",
          entityId: updated.id,
          reason: body.cancellationReason,
        });
      }

      return updated;
    });

    res.json({ data: appointment });
  }
);
