import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { buildCaseContext } from "../lib/workflow-context";

// Mounted at /api/tenants/:tenantId/commitments.
export const commitmentsRouter: Router = Router({ mergeParams: true });
commitmentsRouter.use(requireTenantMatch);

const patchCommitmentSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "DISCONTINUED"]),
  })
  .strict();

// PATCH /tenants/:tenantId/commitments/:commitmentId — CONSULTANT (own case).
// Status transitions only (api-patterns.md §14).
commitmentsRouter.patch(
  "/:commitmentId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchCommitmentSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const commitment = await tx.commitment.findUnique({
        where: { id: req.params.commitmentId },
      });
      if (!commitment || commitment.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Commitment not found", "COMMITMENT_NOT_FOUND");
      }
      await loadOwnConsultantCase(tx, req.params.tenantId, commitment.caseId, req.user!.id);

      const result = await tx.commitment.update({
        where: { id: commitment.id },
        data: { status: body.status },
      });

      if (
        body.status !== commitment.status &&
        (body.status === "COMPLETED" || body.status === "DISCONTINUED")
      ) {
        const eventName =
          body.status === "COMPLETED" ? "COMMITMENT_COMPLETED" : "COMMITMENT_DISCONTINUED";
        await enqueueEventTriggers(tx, req.params.tenantId, eventName, {
          ...(await buildCaseContext(tx, commitment.caseId)),
          commitment: { id: result.id, title: result.title },
        });
      }

      return result;
    });

    res.json({ data: updated });
  }
);
