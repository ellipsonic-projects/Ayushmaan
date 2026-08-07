import type { Prisma, CaseStatus, AppointmentStatus } from "@ayushman/db";
import type { CustomActionOperation } from "@ayushman/types/workflow-node-configs";
import { resolveMergeFields } from "../lib/workflow-merge-fields";

// One handler per CUSTOM_ACTION_OPERATIONS entry (workflow-node-configs.ts)
// — each mirrors an existing router's create/update call so a workflow node
// can invoke any registered schema operation without a bespoke node type.
// Adding an operation is: add the string to CUSTOM_ACTION_OPERATIONS, add its
// handler here. Every handler runs inside the engine's own withTenantContext
// transaction (workflow-engine.service.ts), so RLS still applies exactly as
// it would to the equivalent HTTP request.
type ActionHandler = (
  tx: Prisma.TransactionClient,
  tenantId: string,
  payload: Record<string, unknown>
) => Promise<void>;

const actions: Record<CustomActionOperation, ActionHandler> = {
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
      data: { status: payload.status as CaseStatus },
    });
  },

  APPOINTMENT_UPDATE_STATUS: async (tx, _tenantId, payload) => {
    await tx.appointment.update({
      where: { id: String(payload.appointmentId) },
      data: { status: payload.status as AppointmentStatus },
    });
  },
};

export async function runCustomAction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  operation: CustomActionOperation,
  payload: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<void> {
  const resolvedPayload = resolveMergeFields(payload, context);
  await actions[operation](tx, tenantId, resolvedPayload);
}
