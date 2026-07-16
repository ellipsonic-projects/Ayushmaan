import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";

// Mounted at /api/tenants/:tenantId/cases/:caseId/interactions.
export const caseInteractionsRouter: Router = Router({ mergeParams: true });
caseInteractionsRouter.use(requireTenantMatch);

// Loads the case and, for CONSULTANT, confirms ownership; TENANT_ADMIN and
// SUPER_ADMIN may access any case in the tenant.
async function loadCaseForInteractions(tx: Prisma.TransactionClient, req: TenantScopedRequest) {
  if (req.user!.role === "CONSULTANT") {
    return loadOwnConsultantCase(tx, req.params.tenantId, req.params.caseId, req.user!.id);
  }
  const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
  if (!found || found.tenantId !== req.params.tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }
  return found;
}

async function findInteraction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  caseId: string,
  interactionId: string
) {
  const interaction = await tx.interaction.findUnique({ where: { id: interactionId } });
  if (
    !interaction ||
    interaction.tenantId !== tenantId ||
    interaction.caseId !== caseId ||
    interaction.deletedAt
  ) {
    throw new AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
  }
  return interaction;
}

const createInteractionSchema = z
  .object({
    type: z.enum(["SESSION_NOTE", "AD_HOC_NOTE", "CALL_LOG", "MESSAGE_LOG"]),
    notes: z.string().min(1),
    isClientVisible: z.boolean().default(false),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
caseInteractionsRouter.post(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createInteractionSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForInteractions(tx, req);

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

// GET /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
caseInteractionsRouter.get(
  "/",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const interactions = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForInteractions(tx, req);
      return tx.interaction.findMany({
        where: { caseId: caseRow.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    });
    res.json({ data: interactions });
  }
);

const patchInteractionSchema = z
  .object({
    notes: z.string().min(1).optional(),
    isClientVisible: z.boolean().optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN.
caseInteractionsRouter.patch(
  "/:interactionId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchInteractionSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForInteractions(tx, req);
      await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
      return tx.interaction.update({
        where: { id: req.params.interactionId },
        data: body,
      });
    });

    res.json({ data: updated });
  }
);

// DELETE /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN. Soft-deletes via deletedAt.
caseInteractionsRouter.delete(
  "/:interactionId",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForInteractions(tx, req);
      await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
      await tx.interaction.update({
        where: { id: req.params.interactionId },
        data: { deletedAt: new Date() },
      });
    });
    res.status(204).send();
  }
);
