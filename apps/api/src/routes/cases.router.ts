import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnClientProfileId, getOwnConsultantProfileId } from "../lib/callerProfile";
import { getCaseAuditedForSuperAdmin } from "../services/cases.service";

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
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
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

      return tx.case.findMany({ where });
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

      return tx.case.create({
        data: {
          tenantId: req.params.tenantId,
          clientId: body.clientId,
          consultantId,
          category: body.category,
          matterKey: body.matterKey,
        },
      });
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
      const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
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
      return target;
    });

    res.json({ data: found });
  }
);
