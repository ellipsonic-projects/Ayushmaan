import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnClientProfileId, getOwnConsultantProfileId } from "../lib/callerProfile";
import {
  getCaseAuditedForSuperAdmin,
  listCasesAuditedForSuperAdmin,
} from "../services/cases.service";
import { writeAuditLog } from "../services/audit.service";

const caseDetailInclude = {
  client: {
    select: {
      fullName: true,
      user: { select: { email: true, phone: true } },
    },
  },
  consultant: { select: { id: true, fullName: true } },
  assignments: {
    orderBy: { startedAt: "desc" as const },
    include: { consultant: { select: { id: true, fullName: true } } },
  },
  appointments: { orderBy: { scheduledStart: "desc" as const } },
  interactions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
  commitments: { orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { createdAt: "desc" as const } },
  documents: { orderBy: { createdAt: "desc" as const } },
};

// data_api_v4.md §10 — cases. Mounted at /api/tenants/:tenantId/cases.
//
// This is a minimal slice (list/create/get) — just enough for
// appointments.router.ts to have a parent resource to attach to. PATCH
// (tags/status/matterKey), the /escalate SECURITY DEFINER path, and
// /export are deliberately not built yet; they belong to Phase 4 session
// logging (sprints_v3.md), not this booking-loop pass.
export const casesRouter: Router = Router({ mergeParams: true });
casesRouter.use(requireTenantMatch);

const listCasesQuerySchema = z.object({
  status: z.enum(["PENDING_ASSIGNMENT", "ACTIVE", "ON_HOLD", "CLOSED"]).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

// GET /tenants/:tenantId/cases — CONSULTANT (own only), TENANT_ADMIN
// (metadata only, not notes — this slice has no note content yet anyway),
// SUPER_ADMIN (any tenant, audit-logged, same rationale as GET /:caseId).
casesRouter.get(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    if (req.user!.role === "SUPER_ADMIN") {
      const cases = await listCasesAuditedForSuperAdmin(req.params.tenantId, req.user!.id);
      return res.json({ data: cases });
    }

    const query = listCasesQuerySchema.parse(req.query);

    const cases = await withTenantContext(req.tenantContext!, async (tx) => {
      const where: Record<string, unknown> = {
        tenantId: req.params.tenantId,
        status: query.status,
        deletedAt: null,
        ...(query.tag && { tags: { has: query.tag } }),
      };

      if (req.user!.role === "CONSULTANT") {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (!consultantId) return [];
        where.consultantId = consultantId;
      }

      if (query.search) {
        where.matterKey = { contains: query.search, mode: "insensitive" };
      }

      return tx.case.findMany({
        where,
        select: {
          id: true,
          matterKey: true,
          category: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { fullName: true } },
          consultant: { select: { fullName: true } },
          _count: {
            select: { interactions: true, commitments: true, tasks: true, documents: true },
          },
        },
      });
    });

    res.json({ data: cases });
  }
);

const createCaseSchema = z
  .object({
    clientId: z.string().uuid(),
    category: z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
    matterKey: z.string().max(150).optional(),
    requirements: z.string().max(2000).optional(),
    // Only honored for TENANT_ADMIN callers — a Consultant can never create
    // a case on another consultant's behalf, so this is ignored for them.
    consultantId: z.string().uuid().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases — CONSULTANT (consultantId forced to the
// caller's own profile id), or TENANT_ADMIN/SUPER_ADMIN booking a client
// against a consultant of their choosing (consultantId required in the body).
casesRouter.post(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createCaseSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      let consultantId: string;
      if (req.user!.role === "TENANT_ADMIN" || req.user!.role === "SUPER_ADMIN") {
        if (!body.consultantId) {
          throw new AppError(400, "consultantId is required", "CONSULTANT_ID_REQUIRED");
        }
        const consultant = await tx.consultantProfile.findUnique({
          where: { id: body.consultantId },
        });
        if (!consultant || consultant.tenantId !== req.params.tenantId) {
          throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        consultantId = consultant.id;
      } else {
        const ownConsultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (!ownConsultantId)
          throw new AppError(
            403,
            "No consultant profile for this account",
            "NO_CONSULTANT_PROFILE"
          );
        consultantId = ownConsultantId;
      }

      // Clients are platform-level — no tenant check here, and this may be
      // the client's first Case in this tenant at all, so client_profiles'
      // "has a Case in this tenant" RLS clause can't apply yet. Look the
      // client up with an elevated context (mirrors clients.router.ts's
      // invite-reuse lookup) purely to confirm the id is real.
      const client = await withTenantContext(
        { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
        (superTx) => superTx.clientProfile.findUnique({ where: { id: body.clientId } })
      );
      if (!client) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }

      const created = await tx.case.create({
        data: {
          tenantId: req.params.tenantId,
          clientId: body.clientId,
          consultantId,
          category: body.category,
          matterKey: body.matterKey,
          requirements: body.requirements,
        },
      });

      await tx.caseConsultantAssignment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: created.id,
          consultantId,
          startedAt: created.createdAt,
        },
      });

      return created;
    });

    res.status(201).json({ data: created });
  }
);

const requestCaseSchema = z
  .object({
    category: z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
    matterKey: z.string().max(150).optional(),
    requirements: z.string().max(2000).optional(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    meetingLink: z.string().url().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/request — CLIENT only. A client books
// directly against an organization with no consultant chosen (clients never
// browse individual consultants); this opens a PENDING_ASSIGNMENT shell Case
// plus its first REQUESTED Appointment. A TENANT_ADMIN later assigns a
// consultant via POST /:caseId/assign-consultant, which is what actually
// approves the request.
casesRouter.post(
  "/request",
  requireRole("CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = requestCaseSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const clientId = await getOwnClientProfileId(tx, req.user!.id);
      if (!clientId) {
        throw new AppError(403, "No client profile for this account", "NO_CLIENT_PROFILE");
      }

      const newCase = await tx.case.create({
        data: {
          tenantId: req.params.tenantId,
          clientId,
          consultantId: null,
          category: body.category,
          matterKey: body.matterKey,
          requirements: body.requirements,
          status: "PENDING_ASSIGNMENT",
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: newCase.id,
          scheduledStart: new Date(body.scheduledStart),
          scheduledEnd: new Date(body.scheduledEnd),
          meetingLink: body.meetingLink,
        },
      });

      return { case: newCase, appointment };
    });

    res.status(201).json({ data: created });
  }
);

const assignConsultantSchema = z
  .object({
    consultantId: z.string().uuid(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/assign-consultant — TENANT_ADMIN,
// SUPER_ADMIN only. This is how a TENANT_ADMIN approves a client's direct
// booking request: assigning a consultant to a PENDING_ASSIGNMENT case also
// moves its still-REQUESTED appointment(s) to ADMIN_APPROVED. Cases that
// already have a consultant go through /reassign instead.
casesRouter.post(
  "/:caseId/assign-consultant",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = assignConsultantSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      if (target.status !== "PENDING_ASSIGNMENT" || target.consultantId) {
        throw new AppError(
          409,
          "Case already has a consultant — use /reassign",
          "CASE_ALREADY_ASSIGNED"
        );
      }

      const consultant = await tx.consultantProfile.findUnique({
        where: { id: body.consultantId },
      });
      if (!consultant || consultant.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
      }

      const result = await tx.case.update({
        where: { id: target.id },
        data: { consultantId: body.consultantId, status: "ACTIVE" },
        include: caseDetailInclude,
      });

      await tx.caseConsultantAssignment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: target.id,
          consultantId: body.consultantId,
        },
      });

      await tx.appointment.updateMany({
        where: { caseId: target.id, status: "REQUESTED" },
        data: { status: "ADMIN_APPROVED" },
      });

      await writeAuditLog(tx, {
        tenantId: req.params.tenantId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role as "TENANT_ADMIN" | "SUPER_ADMIN",
        isCrossTenantAccess: req.user!.role === "SUPER_ADMIN",
        action: "ASSIGN_CONSULTANT",
        entityType: "Case",
        entityId: target.id,
      });

      return result;
    });

    res.json({ data: updated });
  }
);

// GET /tenants/:tenantId/cases/:caseId — CONSULTANT (own), self (CLIENT),
// TENANT_ADMIN (metadata only), SUPER_ADMIN (any tenant, audit-logged —
// PRD §1.4 "View own case timeline" row, schema §1.2 "unrestricted ≠ invisible").
casesRouter.get(
  "/:caseId",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    if (req.user!.role === "SUPER_ADMIN") {
      const found = await getCaseAuditedForSuperAdmin(req.params.caseId, req.user!.id);
      if (found.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      return res.json({ data: found });
    }

    const found = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({
        where: { id: req.params.caseId },
        include: caseDetailInclude,
      });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (consultantId !== target.consultantId)
          throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
      }
      if (req.user!.role === "CLIENT") {
        const clientId = await getOwnClientProfileId(tx, req.user!.id);
        if (clientId !== target.clientId) throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
      }

      // Pre-existing cases created before assignment history existed have no
      // rows yet — synthesize (not persisted) a single "current" entry from
      // the case's own consultant/createdAt so the UI always has something.
      if (target.assignments.length === 0) {
        return {
          ...target,
          assignments: [
            {
              id: `synthetic-${target.id}`,
              tenantId: target.tenantId,
              caseId: target.id,
              consultantId: target.consultantId,
              role: "Primary Consultant",
              startedAt: target.createdAt,
              endedAt: null,
              endReason: null,
              consultant: target.consultant,
            },
          ],
        };
      }

      return target;
    });

    res.json({ data: found });
  }
);

const updateRequirementsSchema = z
  .object({
    requirements: z.string().max(2000),
  })
  .strict();

// PATCH /tenants/:tenantId/cases/:caseId — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN. Currently only supports updating the free-text
// requirements brief.
casesRouter.patch(
  "/:caseId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = updateRequirementsSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      if (req.user!.role === "CONSULTANT") {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (consultantId !== target.consultantId) {
          throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
      }

      return tx.case.update({
        where: { id: req.params.caseId },
        data: { requirements: body.requirements },
      });
    });

    res.json({ data: updated });
  }
);

// DELETE /tenants/:tenantId/cases/:caseId — TENANT_ADMIN, SUPER_ADMIN.
// Soft-deletes via deletedAt; case history (interactions, appointments,
// documents) is never removed.
casesRouter.delete(
  "/:caseId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      await tx.case.update({
        where: { id: req.params.caseId },
        data: { deletedAt: new Date() },
      });
    });
    res.status(204).send();
  }
);

const reassignCaseSchema = z
  .object({
    consultantId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/reassign — CONSULTANT (must be the
// case's current consultant) or TENANT_ADMIN. Closes the current assignment
// row and opens a new one; Case.consultantId always mirrors the current row.
casesRouter.post(
  "/:caseId/reassign",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = reassignCaseSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      if (!target.consultantId) {
        throw new AppError(
          409,
          "Case has no consultant yet — use assign-consultant",
          "CASE_PENDING_ASSIGNMENT"
        );
      }

      if (req.user!.role === "CONSULTANT") {
        const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
        if (consultantId !== target.consultantId) {
          throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
      }

      const newConsultant = await tx.consultantProfile.findUnique({
        where: { id: body.consultantId },
      });
      if (!newConsultant || newConsultant.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
      }

      const currentAssignment = await tx.caseConsultantAssignment.findFirst({
        where: { caseId: target.id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });

      if (currentAssignment) {
        await tx.caseConsultantAssignment.update({
          where: { id: currentAssignment.id },
          data: { endedAt: new Date(), endReason: body.reason },
        });
      } else {
        // Backfill the missing historical row for pre-existing cases before
        // closing it, so the history stays complete going forward.
        await tx.caseConsultantAssignment.create({
          data: {
            tenantId: req.params.tenantId,
            caseId: target.id,
            consultantId: target.consultantId,
            startedAt: target.createdAt,
            endedAt: new Date(),
            endReason: body.reason,
          },
        });
      }

      await tx.caseConsultantAssignment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: target.id,
          consultantId: body.consultantId,
        },
      });

      return tx.case.update({
        where: { id: target.id },
        data: { consultantId: body.consultantId },
        include: caseDetailInclude,
      });
    });

    res.json({ data: updated });
  }
);
