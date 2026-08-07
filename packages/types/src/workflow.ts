// Shared contract between the xyflow canvas (Sprint 5.5.3) and the execution
// engine (Sprint 5.5.4); also used server-side to validate a saved graph
// before it's persisted to workflows.graph. Keep in sync with
// packages/db/prisma/schema.prisma's TemplateScope/WorkflowStatus/
// WorkflowTriggerType enums by hand — this package never imports @ayushman/db.

export type WorkflowTemplateScope = "PERSONAL" | "TENANT" | "COMMUNITY";

export type WorkflowNodeType =
  | "TRIGGER"
  | "SEND_EMAIL"
  | "CREATE_TASK"
  | "CREATE_COMMITMENT"
  | "SEND_INTAKE_FORM"
  | "WAIT"
  | "CONDITION"
  | "BRANCH"
  // Escape hatch alongside the fixed node types above: invokes one of a
  // registered set of schema-backed operations (workflow-node-configs.ts's
  // CUSTOM_ACTION_OPERATIONS, executed by apps/api/src/services/
  // workflow-actions.ts) rather than requiring a bespoke node type + config
  // schema + canvas form + engine handler for every new schema operation a
  // workflow might need to trigger.
  | "CUSTOM_ACTION";

export interface WorkflowNodeData {
  nodeType: WorkflowNodeType;
  label: string;
  // Validated server-side against workflow-node-configs.ts's per-type zod
  // schema — kept loose here since this package has no zod-inferred types
  // to reference without creating a circular dependency between the two files.
  config: Record<string, unknown>;
}

export interface WorkflowGraphNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  // e.g. CONDITION/BRANCH's "true"/"false" or per-branch output handle.
  sourceHandle?: string | null;
}

export interface WorkflowGraph {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
}
