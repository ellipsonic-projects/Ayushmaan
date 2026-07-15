import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { loadOwnConsultantCase } from "../lib/caseAccess";

// Mounted at /api/tenants/:tenantId/cases/:caseId/commitments.
export const caseCommitmentsRouter: Router = Router({ mergeParams: true });
caseCommitmentsRouter.use(requireTenantMatch);

const createCommitmentSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    dueAt: z.string().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/commitments — CONSULTANT (own case).
caseCommitmentsRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createCommitmentSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadOwnConsultantCase(
        tx,
        req.params.tenantId,
        req.params.caseId,
        req.user!.id
      );

      return tx.commitment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          title: body.title,
          description: body.description,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        },
      });
    });

    res.status(201).json({ data: created });
  }
);
