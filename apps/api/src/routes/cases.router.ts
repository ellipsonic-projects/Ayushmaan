import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnClientProfileId, getOwnConsultantProfileId } from "../lib/callerProfile";
import { getCaseAuditedForSuperAdmin } from "../services/cases.service";

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
  interactions: { orderBy: { createdAt: "desc" as const } },
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
  status: z.enum(["ACTIVE", "ON_HOLD", "CLOSED"]).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

// GET /tenants/:tenantId/cases — CONSULTANT (own only), TENANT_ADMIN
// (metadata only, not notes — this slice has no note content yet anyway).
casesRouter.get(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listCasesQuerySchema.parse(req.query);

    const cases = await withTenantContext(req.tenantContext!, async (tx) => {
      const where: Record<string, unknown> = {
        tenantId: req.params.tenantId,
        status: query.status,
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
  })
  .strict();

// POST /tenants/:tenantId/cases — CONSULTANT. consultantId is forced to the
// caller's own profile id — a Consultant can never create a case on
// another consultant's behalf.
casesRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createCaseSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!consultantId)
        throw new AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");

      const client = await tx.clientProfile.findUnique({ where: { id: body.clientId } });
      if (!client || client.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      }

      const created = await tx.case.create({
        data: {
          tenantId: req.params.tenantId,
          clientId: body.clientId,
          consultantId,
          category: body.category,
          matterKey: body.matterKey,
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

// PATCH /tenants/:tenantId/cases/:caseId — CONSULTANT (own case). Currently
// only supports updating the free-text requirements brief.
casesRouter.patch(
  "/:caseId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = updateRequirementsSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (consultantId !== target.consultantId) {
        throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
      }

      return tx.case.update({
        where: { id: req.params.caseId },
        data: { requirements: body.requirements },
      });
    });

    res.json({ data: updated });
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
