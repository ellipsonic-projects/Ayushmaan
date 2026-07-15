import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { loadOwnConsultantCase } from "../lib/caseAccess";

// Mounted at /api/tenants/:tenantId/cases/:caseId/interactions.
export const caseInteractionsRouter: Router = Router({ mergeParams: true });
caseInteractionsRouter.use(requireTenantMatch);

const createInteractionSchema = z
  .object({
    type: z.enum(["SESSION_NOTE", "AD_HOC_NOTE", "CALL_LOG", "MESSAGE_LOG"]),
    notes: z.string().min(1),
    isClientVisible: z.boolean().default(false),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case).
caseInteractionsRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createInteractionSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadOwnConsultantCase(
        tx,
        req.params.tenantId,
        req.params.caseId,
        req.user!.id
      );

      return tx.interaction.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          type: body.type,
          notes: body.notes,
          isClientVisible: body.isClientVisible,
        },
      });
    });

    res.status(201).json({ data: created });
  }
);
