import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { createSessionAudioUploadUrl } from "../integrations/storage";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { buildCaseContext } from "../lib/workflow-context";

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
    // Only a SESSION_NOTE may be tied to the appointment it was logged
    // during — AD_HOC_NOTE/CALL_LOG/MESSAGE_LOG are for logging a thought
    // between sessions and never carry an appointment link.
    appointmentId: z.string().uuid().optional(),
    // Set together when a session recording was captured (Sprint 4.2):
    // audioStoragePath points at the uploaded Supabase Storage object,
    // transcriptionStatus reflects the in-browser transcription outcome
    // (transcription itself runs client-side, so this is a status report,
    // not a dispatch trigger).
    audioStoragePath: z.string().min(1).optional(),
    transcriptionStatus: z.enum(["PENDING", "PROCESSING", "COMPLETE", "FAILED"]).optional(),
  })
  .strict()
  .refine((body) => body.type === "SESSION_NOTE" || !body.appointmentId, {
    message: "appointmentId is only valid for a SESSION_NOTE",
    path: ["appointmentId"],
  });

const audioUploadUrlSchema = z
  .object({
    fileName: z.string().min(1),
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

      if (body.appointmentId) {
        const appointment = await tx.appointment.findUnique({
          where: { id: body.appointmentId },
        });
        if (!appointment || appointment.caseId !== caseRow.id) {
          throw new AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
        }
      }

      const interaction = await tx.interaction.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          appointmentId: body.appointmentId,
          type: body.type,
          notes: body.notes,
          isClientVisible: body.isClientVisible,
          audioStoragePath: body.audioStoragePath,
          transcriptionStatus: body.transcriptionStatus,
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "INTERACTION_LOGGED", {
        ...(await buildCaseContext(tx, caseRow.id)),
        interaction: {
          id: interaction.id,
          type: interaction.type,
          isClientVisible: interaction.isClientVisible,
        },
      });

      return interaction;
    });

    res.status(201).json({ data: created });
  }
);

// POST /tenants/:tenantId/cases/:caseId/interactions/audio-upload-url —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN. Issues a short-lived
// signed Storage upload URL for a session recording (Sprint 4.2) — never a
// raw bucket credential, per schema §1.7.
caseInteractionsRouter.post(
  "/audio-upload-url",
  requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = audioUploadUrlSchema.parse(req.body);

    const caseRow = await withTenantContext(req.tenantContext!, (tx) =>
      loadCaseForInteractions(tx, req)
    );

    const upload = await createSessionAudioUploadUrl(req.tenant!.slug, caseRow.id, body.fileName);
    res.status(201).json({ data: upload });
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
    // Lets a Consultant correct transcription errors (Sprint 4.2 manual
    // transcript-edit UI) and retry/finalize the transcription status.
    transcriptionStatus: z.enum(["PENDING", "PROCESSING", "COMPLETE", "FAILED"]).optional(),
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
