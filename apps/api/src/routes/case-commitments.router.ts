import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { getOwnClientProfileId } from "../lib/callerProfile";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { buildCaseContext } from "../lib/workflow-context";

// Mounted at /api/tenants/:tenantId/cases/:caseId/commitments.
export const caseCommitmentsRouter: Router = Router({ mergeParams: true });
caseCommitmentsRouter.use(requireTenantMatch);

// CONSULTANT must own the case; CLIENT must be the case's own client.
async function loadCaseForCommitments(tx: Prisma.TransactionClient, req: TenantScopedRequest) {
  if (req.user!.role === "CONSULTANT") {
    return loadOwnConsultantCase(tx, req.params.tenantId, req.params.caseId, req.user!.id);
  }
  const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
  if (!found || found.tenantId !== req.params.tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }
  const clientId = await getOwnClientProfileId(tx, req.user!.id);
  if (clientId !== found.clientId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
  }
  return found;
}

const createCommitmentSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    dueAt: z.string().optional(),
    // The session (interaction) this was logged during, if any — lets the
    // consultant-facing timeline nest this commitment under a specific
    // appointment.
    interactionId: z.string().uuid().optional(),
    // Direct appointment scoping, independent of interactionId — lets the
    // consultant log a commitment against an appointment without first
    // writing a session note.
    appointmentId: z.string().uuid().optional(),
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

      if (body.interactionId) {
        const interaction = await tx.interaction.findUnique({
          where: { id: body.interactionId },
        });
        if (!interaction || interaction.caseId !== caseRow.id) {
          throw new AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
        }
      }

      if (body.appointmentId) {
        const appointment = await tx.appointment.findUnique({
          where: { id: body.appointmentId },
        });
        if (!appointment || appointment.caseId !== caseRow.id) {
          throw new AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
        }
      }

      const commitment = await tx.commitment.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          title: body.title,
          description: body.description,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
          interactionId: body.interactionId,
          appointmentId: body.appointmentId,
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "COMMITMENT_CREATED", {
        ...(await buildCaseContext(tx, caseRow.id)),
        commitment: { id: commitment.id, title: commitment.title, dueAt: commitment.dueAt },
      });

      return commitment;
    });

    res.status(201).json({ data: created });
  }
);

// GET /tenants/:tenantId/cases/:caseId/commitments — CONSULTANT (own case),
// self (CLIENT).
caseCommitmentsRouter.get(
  "/",
  requireRole("CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const commitments = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForCommitments(tx, req);
      return tx.commitment.findMany({
        where: { caseId: caseRow.id },
        orderBy: { createdAt: "desc" },
      });
    });
    res.json({ data: commitments });
  }
);
