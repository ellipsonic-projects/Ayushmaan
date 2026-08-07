"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCustomAction = runCustomAction;
const workflow_merge_fields_1 = require("../lib/workflow-merge-fields");
const actions = {
    TASK_CREATE: async (tx, tenantId, payload) => {
        await tx.task.create({
            data: {
                tenantId,
                caseId: String(payload.caseId),
                title: String(payload.title ?? "Untitled task"),
                assignedTo: payload.assignedTo === "CLIENT" ? "CLIENT" : "CONSULTANT",
                dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : undefined,
                appointmentId: payload.appointmentId ? String(payload.appointmentId) : undefined,
                interactionId: payload.interactionId ? String(payload.interactionId) : undefined,
            },
        });
    },
    TASK_COMPLETE: async (tx, _tenantId, payload) => {
        await tx.task.update({
            where: { id: String(payload.taskId) },
            data: { status: "COMPLETED", completedAt: new Date() },
        });
    },
    COMMITMENT_CREATE: async (tx, tenantId, payload) => {
        await tx.commitment.create({
            data: {
                tenantId,
                caseId: String(payload.caseId),
                title: String(payload.title ?? "Untitled commitment"),
                description: payload.description ? String(payload.description) : undefined,
                dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : undefined,
                appointmentId: payload.appointmentId ? String(payload.appointmentId) : undefined,
                interactionId: payload.interactionId ? String(payload.interactionId) : undefined,
            },
        });
    },
    COMMITMENT_COMPLETE: async (tx, _tenantId, payload) => {
        await tx.commitment.update({
            where: { id: String(payload.commitmentId) },
            data: { status: "COMPLETED" },
        });
    },
    CASE_UPDATE_TAGS: async (tx, _tenantId, payload) => {
        await tx.case.update({
            where: { id: String(payload.caseId) },
            data: { tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [] },
        });
    },
    CASE_UPDATE_STATUS: async (tx, _tenantId, payload) => {
        await tx.case.update({
            where: { id: String(payload.caseId) },
            data: { status: payload.status },
        });
    },
    APPOINTMENT_UPDATE_STATUS: async (tx, _tenantId, payload) => {
        await tx.appointment.update({
            where: { id: String(payload.appointmentId) },
            data: { status: payload.status },
        });
    },
};
async function runCustomAction(tx, tenantId, operation, payload, context) {
    const resolvedPayload = (0, workflow_merge_fields_1.resolveMergeFields)(payload, context);
    await actions[operation](tx, tenantId, resolvedPayload);
}
//# sourceMappingURL=workflow-actions.js.map