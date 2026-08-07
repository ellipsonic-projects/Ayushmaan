import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { getOwnConsultantProfileId } from "../lib/callerProfile";
import { AppError } from "../middleware/errorHandler";

// Mounted at /api/tenants/:tenantId/search — powers the header search bar.
export const searchRouter: Router = Router({ mergeParams: true });
searchRouter.use(requireTenantMatch);

const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
});

const RESULT_LIMIT = 5;

// GET /tenants/:tenantId/search?q=... — looks up consultants, clients,
// interactions, commitments and tasks in one call. CONSULTANT is scoped to
// their own cases (mirrors clients.router.ts's list-clients scoping);
// TENANT_ADMIN/SUPER_ADMIN see the whole tenant.
searchRouter.get(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const { q } = searchQuerySchema.parse(req.query);
    const tenantId = req.params.tenantId;
    const term = { contains: q, mode: "insensitive" as const };

    const results = await withTenantContext(req.tenantContext!, async (tx) => {
      const isConsultant = req.user!.role === "CONSULTANT";
      const consultantId = isConsultant ? await getOwnConsultantProfileId(tx, req.user!.id) : null;
      if (isConsultant && !consultantId) {
        throw new AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
      }
      const caseFilter = { tenantId, ...(isConsultant && { consultantId }) };

      const [consultants, clients, interactions, commitments, tasks] = await Promise.all([
        // Peer directory search isn't relevant to a consultant's own workspace.
        isConsultant
          ? Promise.resolve([])
          : tx.consultantProfile.findMany({
              where: { tenantId, fullName: term },
              select: { id: true, fullName: true, category: true },
              take: RESULT_LIMIT,
            }),
        tx.clientProfile.findMany({
          where: { fullName: term, cases: { some: caseFilter } },
          select: { id: true, fullName: true },
          take: RESULT_LIMIT,
        }),
        tx.interaction.findMany({
          where: { notes: term, case: caseFilter },
          select: {
            id: true,
            notes: true,
            type: true,
            caseId: true,
            case: { select: { client: { select: { fullName: true } } } },
          },
          take: RESULT_LIMIT,
        }),
        tx.commitment.findMany({
          where: { OR: [{ title: term }, { description: term }], case: caseFilter },
          select: { id: true, title: true, status: true, caseId: true },
          take: RESULT_LIMIT,
        }),
        tx.task.findMany({
          where: { title: term, case: caseFilter },
          select: { id: true, title: true, status: true, caseId: true },
          take: RESULT_LIMIT,
        }),
      ]);

      return { consultants, clients, interactions, commitments, tasks };
    });

    res.json({ data: results });
  }
);
