import { z } from "zod";

// One zod schema per WorkflowNodeType (workflow.ts), discriminated on
// `nodeType` so a saved WorkflowGraph node's `data.config` can be validated
// against the exact shape its node type expects — used both by the canvas's
// config-panel form (Sprint 5.5.3) and server-side before persisting a graph.

const triggerConfigSchema = z.object({
  nodeType: z.literal("TRIGGER"),
  triggerType: z.enum(["SCHEDULE", "EVENT", "MANUAL"]),
  cron: z.string().optional(), // SCHEDULE only
  eventName: z.string().optional(), // EVENT only, e.g. "APPOINTMENT_BOOKED"
  // FORM_SUBMITTED only — pins the trigger to a specific form_templates row so
  // two workflows watching different forms don't both fire on every submission.
  formTemplateId: z.string().uuid().optional(),
});

const sendEmailConfigSchema = z.object({
  nodeType: z.literal("SEND_EMAIL"),
  templateId: z.string().uuid(),
  recipient: z.enum(["CLIENT", "CONSULTANT"]).default("CLIENT"),
});

const createTaskConfigSchema = z.object({
  nodeType: z.literal("CREATE_TASK"),
  title: z.string().min(1).max(200),
  assignedTo: z.enum(["CLIENT", "CONSULTANT"]),
  dueInMins: z.number().int().positive().optional(),
});

const createCommitmentConfigSchema = z.object({
  nodeType: z.literal("CREATE_COMMITMENT"),
  title: z.string().min(1).max(200),
  dueInMins: z.number().int().positive().optional(),
});

const sendIntakeFormConfigSchema = z.object({
  nodeType: z.literal("SEND_INTAKE_FORM"),
  formTemplateId: z.string().uuid(),
  channel: z.literal("EMAIL"),
});

const waitConfigSchema = z.object({
  nodeType: z.literal("WAIT"),
  durationMins: z.number().int().positive(),
});

const conditionConfigSchema = z.object({
  nodeType: z.literal("CONDITION"),
  field: z.string().min(1), // dot-path into workflow_runs.context, e.g. "appointment.status"
  operator: z.enum(["EQUALS", "NOT_EQUALS", "EXISTS"]),
  value: z.string().optional(),
});

const branchConfigSchema = z.object({
  nodeType: z.literal("BRANCH"),
  branches: z
    .array(
      z.object({
        label: z.string().min(1),
        field: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

// The CUSTOM_ACTION escape hatch (workflow.ts) — each entry here is backed by
// a handler in apps/api/src/services/workflow-actions.ts that mirrors an
// existing router's schema operation. Adding a new schema-backed operation to
// a workflow is: add the string here, add its handler, done — no new
// WorkflowNodeType, config schema, or canvas form required.
export const CUSTOM_ACTION_OPERATIONS = [
  "TASK_CREATE",
  "TASK_COMPLETE",
  "COMMITMENT_CREATE",
  "COMMITMENT_COMPLETE",
  "CASE_UPDATE_TAGS",
  "CASE_UPDATE_STATUS",
  "APPOINTMENT_UPDATE_STATUS",
] as const;

export type CustomActionOperation = (typeof CUSTOM_ACTION_OPERATIONS)[number];

const customActionConfigSchema = z.object({
  nodeType: z.literal("CUSTOM_ACTION"),
  operation: z.enum(CUSTOM_ACTION_OPERATIONS),
  // Merge-field template resolved against workflow_runs.context before the
  // operation runs, e.g. { "caseId": "{{case.id}}", "tags": ["priority"] } —
  // shape is operation-specific, validated by the handler itself rather than
  // here (kept loose the same way WorkflowNodeData.config is).
  payload: z.record(z.unknown()).default({}),
});

export const workflowNodeConfigSchema = z.discriminatedUnion("nodeType", [
  triggerConfigSchema,
  sendEmailConfigSchema,
  createTaskConfigSchema,
  createCommitmentConfigSchema,
  sendIntakeFormConfigSchema,
  waitConfigSchema,
  conditionConfigSchema,
  branchConfigSchema,
  customActionConfigSchema,
]);

export type WorkflowNodeConfig = z.infer<typeof workflowNodeConfigSchema>;
export type NodeConfigFor<T extends WorkflowNodeConfig["nodeType"]> = Extract<
  WorkflowNodeConfig,
  { nodeType: T }
>;
