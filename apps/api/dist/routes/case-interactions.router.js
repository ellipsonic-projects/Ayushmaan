"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseInteractionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const storage_1 = require("../integrations/storage");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
// Mounted at /api/tenants/:tenantId/cases/:caseId/interactions.
exports.caseInteractionsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseInteractionsRouter.use(require_tenant_match_1.requireTenantMatch);
// Loads the case and, for CONSULTANT, confirms ownership; TENANT_ADMIN and
// SUPER_ADMIN may access any case in the tenant.
async function loadCaseForInteractions(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    return found;
}
async function findInteraction(tx, tenantId, caseId, interactionId) {
    const interaction = await tx.interaction.findUnique({ where: { id: interactionId } });
    if (!interaction ||
        interaction.tenantId !== tenantId ||
        interaction.caseId !== caseId ||
        interaction.deletedAt) {
        throw new errorHandler_1.AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
    }
    return interaction;
}
const createInteractionSchema = zod_1.z
    .object({
    type: zod_1.z.enum(["SESSION_NOTE", "AD_HOC_NOTE", "CALL_LOG", "MESSAGE_LOG"]),
    notes: zod_1.z.string().min(1),
    isClientVisible: zod_1.z.boolean().default(false),
    // Only a SESSION_NOTE may be tied to the appointment it was logged
    // during — AD_HOC_NOTE/CALL_LOG/MESSAGE_LOG are for logging a thought
    // between sessions and never carry an appointment link.
    appointmentId: zod_1.z.string().uuid().optional(),
    // Set together when a session recording was captured (Sprint 4.2):
    // audioStoragePath points at the uploaded Supabase Storage object,
    // transcriptionStatus reflects the in-browser transcription outcome
    // (transcription itself runs client-side, so this is a status report,
    // not a dispatch trigger).
    audioStoragePath: zod_1.z.string().min(1).optional(),
    transcriptionStatus: zod_1.z.enum(["PENDING", "PROCESSING", "COMPLETE", "FAILED"]).optional(),
})
    .strict()
    .refine((body) => body.type === "SESSION_NOTE" || !body.appointmentId, {
    message: "appointmentId is only valid for a SESSION_NOTE",
    path: ["appointmentId"],
});
const audioUploadUrlSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().min(1),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createInteractionSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        if (body.appointmentId) {
            const appointment = await tx.appointment.findUnique({
                where: { id: body.appointmentId },
            });
            if (!appointment || appointment.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
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
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "INTERACTION_LOGGED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
            interaction: {
                id: interaction.id,
                type: interaction.type,
                isClientVisible: interaction.isClientVisible,
            },
        });
        return interaction;
    });
    res.status(201).json({ data: created });
});
// POST /tenants/:tenantId/cases/:caseId/interactions/audio-upload-url —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN. Issues a short-lived
// signed Storage upload URL for a session recording (Sprint 4.2) — never a
// raw bucket credential, per schema §1.7.
exports.caseInteractionsRouter.post("/audio-upload-url", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = audioUploadUrlSchema.parse(req.body);
    const caseRow = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => loadCaseForInteractions(tx, req));
    const upload = await (0, storage_1.createSessionAudioUploadUrl)(req.tenant.slug, caseRow.id, body.fileName);
    res.status(201).json({ data: upload });
});
// GET /tenants/:tenantId/cases/:caseId/interactions — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const interactions = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        return tx.interaction.findMany({
            where: { caseId: caseRow.id, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: interactions });
});
const patchInteractionSchema = zod_1.z
    .object({
    notes: zod_1.z.string().min(1).optional(),
    isClientVisible: zod_1.z.boolean().optional(),
    // Lets a Consultant correct transcription errors (Sprint 4.2 manual
    // transcript-edit UI) and retry/finalize the transcription status.
    transcriptionStatus: zod_1.z.enum(["PENDING", "PROCESSING", "COMPLETE", "FAILED"]).optional(),
})
    .strict();
// PATCH /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN.
exports.caseInteractionsRouter.patch("/:interactionId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = patchInteractionSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
        return tx.interaction.update({
            where: { id: req.params.interactionId },
            data: body,
        });
    });
    res.json({ data: updated });
});
// DELETE /tenants/:tenantId/cases/:caseId/interactions/:interactionId —
// CONSULTANT (own case), TENANT_ADMIN, SUPER_ADMIN. Soft-deletes via deletedAt.
exports.caseInteractionsRouter.delete("/:interactionId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForInteractions(tx, req);
        await findInteraction(tx, req.params.tenantId, caseRow.id, req.params.interactionId);
        await tx.interaction.update({
            where: { id: req.params.interactionId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
//# sourceMappingURL=case-interactions.router.js.map