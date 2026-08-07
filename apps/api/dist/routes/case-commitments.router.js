"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseCommitmentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const callerProfile_1 = require("../lib/callerProfile");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
// Mounted at /api/tenants/:tenantId/cases/:caseId/commitments.
exports.caseCommitmentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseCommitmentsRouter.use(require_tenant_match_1.requireTenantMatch);
// CONSULTANT must own the case; CLIENT must be the case's own client.
async function loadCaseForCommitments(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
    if (clientId !== found.clientId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
    }
    return found;
}
const createCommitmentSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    dueAt: zod_1.z.string().optional(),
    // The session (interaction) this was logged during, if any — lets the
    // consultant-facing timeline nest this commitment under a specific
    // appointment.
    interactionId: zod_1.z.string().uuid().optional(),
    // Direct appointment scoping, independent of interactionId — lets the
    // consultant log a commitment against an appointment without first
    // writing a session note.
    appointmentId: zod_1.z.string().uuid().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/commitments — CONSULTANT (own case).
exports.caseCommitmentsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createCommitmentSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        if (body.interactionId) {
            const interaction = await tx.interaction.findUnique({
                where: { id: body.interactionId },
            });
            if (!interaction || interaction.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
            }
        }
        if (body.appointmentId) {
            const appointment = await tx.appointment.findUnique({
                where: { id: body.appointmentId },
            });
            if (!appointment || appointment.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
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
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "COMMITMENT_CREATED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
            commitment: { id: commitment.id, title: commitment.title, dueAt: commitment.dueAt },
        });
        return commitment;
    });
    res.status(201).json({ data: created });
});
// GET /tenants/:tenantId/cases/:caseId/commitments — CONSULTANT (own case),
// self (CLIENT).
exports.caseCommitmentsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    const commitments = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForCommitments(tx, req);
        return tx.commitment.findMany({
            where: { caseId: caseRow.id },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: commitments });
});
//# sourceMappingURL=case-commitments.router.js.map