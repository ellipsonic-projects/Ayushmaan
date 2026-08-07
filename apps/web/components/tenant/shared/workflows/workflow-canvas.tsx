"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { create } from "zustand";
import {
  ArrowRightToLine,
  CalendarClock,
  CheckCircle2,
  ChevronRightIcon,
  ClipboardList,
  GitBranch,
  ListTree,
  Mail,
  Plus,
  Split,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WorkflowGraph, WorkflowNodeData, WorkflowNodeType } from "@ayushman/types/workflow";
import {
  CUSTOM_ACTION_OPERATIONS,
  workflowNodeConfigSchema,
  type CustomActionOperation,
} from "@ayushman/types/workflow-node-configs";
import type { Workflow, WorkflowStatus } from "@/lib/api/workflows.server";
import {
  runWorkflowNow,
  updateWorkflow,
  type WorkflowTenantParam,
} from "@/lib/api/workflows.client";
import { listWorkflowTemplates } from "@/lib/api/workflow-templates.client";
import type { WorkflowTemplate } from "@/lib/api/workflow-templates.server";
import { listFormTemplates } from "@/lib/api/form-templates.client";
import type { FormTemplate } from "@/lib/api/form-templates.server";

// xyflow's Node<T> constrains T to Record<string, unknown> (an index
// signature check, not just structural assignability) — the intersection
// satisfies that constraint while keeping WorkflowNodeData's named fields.
type CanvasNodeData = WorkflowNodeData & Record<string, unknown>;
type CanvasNode = Node<CanvasNodeData, WorkflowNodeType>;

// Grouped for the palette (Sprint 5.5.5 item 4's node-palette UX pass) —
// purely presentational; a node's behavior only ever depends on `type`.
type PaletteCategory = "Trigger" | "Actions" | "Logic";

const NODE_PALETTE: {
  type: WorkflowNodeType;
  label: string;
  icon: keyof typeof NODE_ICON;
  category: PaletteCategory;
}[] = [
  { type: "TRIGGER", label: "Trigger", icon: "TRIGGER", category: "Trigger" },
  { type: "SEND_EMAIL", label: "Send email", icon: "SEND_EMAIL", category: "Actions" },
  { type: "CREATE_TASK", label: "Create task", icon: "CREATE_TASK", category: "Actions" },
  {
    type: "CREATE_COMMITMENT",
    label: "Create commitment",
    icon: "CREATE_COMMITMENT",
    category: "Actions",
  },
  {
    type: "SEND_INTAKE_FORM",
    label: "Forms",
    icon: "SEND_INTAKE_FORM",
    category: "Actions",
  },
  { type: "CUSTOM_ACTION", label: "Custom action", icon: "CUSTOM_ACTION", category: "Actions" },
  { type: "WAIT", label: "Wait", icon: "WAIT", category: "Logic" },
  { type: "CONDITION", label: "Condition", icon: "CONDITION", category: "Logic" },
  { type: "BRANCH", label: "Branch", icon: "BRANCH", category: "Logic" },
];

const PALETTE_CATEGORIES: PaletteCategory[] = ["Trigger", "Actions", "Logic"];

// One-line description shown atop the config panel (Sprint 5.5.5 item 4's
// config-panel polish) — purely explanatory, no effect on validation/config.
const NODE_DESCRIPTION: Record<WorkflowNodeType, string> = {
  TRIGGER: "Starts the workflow — on a schedule, an event, or manually.",
  SEND_EMAIL: "Sends an email using one of your templates.",
  CREATE_TASK: "Creates a task on the case this run is for.",
  CREATE_COMMITMENT: "Creates a commitment on the case this run is for.",
  SEND_INTAKE_FORM: "Sends a link to an intake form the client fills out via email.",
  WAIT: "Pauses the run for a fixed duration before continuing.",
  CONDITION: "Branches true/false based on a field in the run's data.",
  BRANCH: "Branches into multiple named paths based on a field's value.",
  CUSTOM_ACTION:
    "Runs any registered schema operation — the escape hatch for anything not covered above.",
};

const NODE_ICON = {
  TRIGGER: Zap,
  SEND_EMAIL: Mail,
  CREATE_TASK: ListTree,
  CREATE_COMMITMENT: CalendarClock,
  SEND_INTAKE_FORM: ClipboardList,
  WAIT: CalendarClock,
  CONDITION: Split,
  BRANCH: GitBranch,
  CUSTOM_ACTION: Wrench,
} satisfies Record<WorkflowNodeType, typeof Mail>;

// Every event name an EVENT trigger can actually match — kept in sync with
// every enqueueEventTriggers(...) call site under apps/api/src/routes. A
// dropdown of these (rather than free text) is both more discoverable and
// rules out triggers pointed at an event name that will never fire.
const EVENT_TRIGGER_OPTIONS: { value: string; label: string }[] = [
  { value: "NEW_CLIENT", label: "New client" },
  { value: "APPOINTMENT_BOOKED", label: "Appointment booked" },
  { value: "APPOINTMENT_CANCELLED", label: "Appointment cancelled" },
  { value: "APPOINTMENT_COMPLETED", label: "Appointment completed" },
  { value: "APPOINTMENT_RESCHEDULED", label: "Appointment rescheduled" },
  { value: "APPOINTMENT_SERIES_BOOKED", label: "Appointment series booked" },
  { value: "APPOINTMENT_SERIES_CANCELLED", label: "Appointment series cancelled" },
  { value: "TASK_CREATED", label: "Task created" },
  { value: "TASK_COMPLETED", label: "Task completed" },
  { value: "COMMITMENT_CREATED", label: "Commitment created" },
  { value: "COMMITMENT_COMPLETED", label: "Commitment completed" },
  { value: "COMMITMENT_DISCONTINUED", label: "Commitment discontinued" },
  { value: "DOCUMENT_UPLOADED", label: "Document uploaded" },
  { value: "FORM_SUBMITTED", label: "Form submitted" },
  { value: "INTERACTION_LOGGED", label: "Interaction logged" },
  { value: "CASE_ASSIGNED", label: "Case assigned" },
  { value: "CASE_CLOSED", label: "Case closed" },
  { value: "CASE_REOPENED", label: "Case reopened" },
  { value: "CASE_REASSIGNED", label: "Case reassigned" },
  { value: "CASE_DELETED", label: "Case deleted" },
  { value: "REFERRAL_CREATED", label: "Referral created" },
  { value: "REFERRAL_ACCEPTED", label: "Referral accepted" },
  { value: "REFERRAL_DECLINED", label: "Referral declined" },
  { value: "CONTACT_CREATED", label: "Contact created" },
  { value: "CONSULTANT_ONBOARDED", label: "Consultant onboarded" },
  { value: "CONSULTANT_APPLICATION_SUBMITTED", label: "Consultant application submitted" },
  { value: "CONSULTANT_APPLICATION_APPROVED", label: "Consultant application approved" },
  { value: "CONSULTANT_APPLICATION_REJECTED", label: "Consultant application rejected" },
  { value: "USER_INVITED", label: "User invited" },
];

// Human-readable label + a short description of the payload fields each
// CUSTOM_ACTION_OPERATIONS entry expects — kept here (not in
// @ayushman/types, which stays UI-agnostic) since it's purely presentational.
const CUSTOM_ACTION_LABEL: Record<CustomActionOperation, { label: string; payloadHint: string }> = {
  TASK_CREATE: { label: "Create task", payloadHint: "caseId, title, assignedTo, dueAt?" },
  TASK_COMPLETE: { label: "Complete task", payloadHint: "taskId" },
  COMMITMENT_CREATE: {
    label: "Create commitment",
    payloadHint: "caseId, title, description?, dueAt?",
  },
  COMMITMENT_COMPLETE: { label: "Complete commitment", payloadHint: "commitmentId" },
  CASE_UPDATE_TAGS: { label: "Update case tags", payloadHint: "caseId, tags (comma-separated)" },
  CASE_UPDATE_STATUS: { label: "Update case status", payloadHint: "caseId, status" },
  APPOINTMENT_UPDATE_STATUS: {
    label: "Update appointment status",
    payloadHint: "appointmentId, status",
  },
};

function defaultConfig(nodeType: WorkflowNodeType): Record<string, unknown> {
  switch (nodeType) {
    case "TRIGGER":
      return { nodeType, triggerType: "MANUAL" };
    case "SEND_EMAIL":
      return { nodeType, templateId: "" };
    case "CREATE_TASK":
      return { nodeType, title: "", assignedTo: "CONSULTANT" };
    case "CREATE_COMMITMENT":
      return { nodeType, title: "" };
    case "SEND_INTAKE_FORM":
      return { nodeType, formTemplateId: "", channel: "EMAIL" };
    case "WAIT":
      return { nodeType, durationMins: 60 };
    case "CONDITION":
      return { nodeType, field: "", operator: "EXISTS" };
    case "BRANCH":
      return { nodeType, branches: [{ label: "Branch 1", field: "", value: "" }] };
    case "CUSTOM_ACTION":
      return { nodeType, operation: CUSTOM_ACTION_OPERATIONS[0], payload: {} };
  }
}

function isConfigured(nodeType: WorkflowNodeType, config: Record<string, unknown>) {
  return workflowNodeConfigSchema.safeParse({ ...config, nodeType }).success;
}

let nodeSeq = 0;
function nextNodeId(nodeType: WorkflowNodeType) {
  nodeSeq += 1;
  return `${nodeType.toLowerCase()}-${Date.now()}-${nodeSeq}`;
}

// zustand only holds transient canvas state (nodes/edges/selection) — the
// persisted source of truth is workflows.graph, loaded in and serialized out
// on save (Sprint 5.5.3 items 1 & 7).
interface CanvasState {
  nodes: CanvasNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  setNodes: (updater: (nodes: CanvasNode[]) => CanvasNode[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  removeSelected: () => void;
}

function createCanvasStore(initial: WorkflowGraph) {
  // Guard against the DB default `{}` (no nodes/edges keys) on a brand-new workflow.
  const initialNodes: CanvasNode[] = (initial.nodes ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as CanvasNodeData,
  }));
  const initialEdges: Edge[] = (initial.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    type: "smoothstep",
    style: { stroke: "var(--border)", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
  }));

  return create<CanvasState>((set) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    setNodes: (updater) => set((state) => ({ nodes: updater(state.nodes) })),
    setEdges: (updater) => set((state) => ({ edges: updater(state.edges) })),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    updateNodeConfig: (id, config) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, config } } : node
        ),
      })),
    removeSelected: () =>
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== state.selectedNodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== state.selectedNodeId && edge.target !== state.selectedNodeId
        ),
        selectedNodeId: null,
      })),
  }));
}

function WorkflowNodeCard({ id, data, selected }: NodeProps<CanvasNode>) {
  const Icon = NODE_ICON[data.nodeType];
  const configured = isConfigured(data.nodeType, data.config);
  const branchCount =
    data.nodeType === "BRANCH" ? ((data.config.branches as unknown[]) ?? []).length : 0;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex w-64 items-center gap-3 rounded-lg border bg-background px-3 py-3 shadow-sm transition-colors",
          selected ? "border-primary ring-2 ring-primary/20" : "border-border"
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{data.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {data.nodeType.replace(/_/g, " ")}
          </p>
        </div>
        {configured && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
      </div>

      {data.nodeType !== "TRIGGER" && (
        <Handle type="target" position={Position.Top} className="h-2! w-2!" />
      )}

      {data.nodeType === "CONDITION" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
            className="h-2! w-2! bg-emerald-600!"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
            className="h-2! w-2! bg-destructive!"
          />
        </>
      ) : data.nodeType === "BRANCH" ? (
        Array.from({ length: Math.max(branchCount, 1) }).map((_, index) => (
          <Handle
            key={index}
            type="source"
            position={Position.Bottom}
            id={String(index)}
            style={{ left: `${((index + 1) / (branchCount + 1)) * 100}%` }}
            className="h-2! w-2!"
          />
        ))
      ) : (
        <Handle type="source" position={Position.Bottom} className="h-2! w-2!" id={id} />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = Object.fromEntries(
  NODE_PALETTE.map(({ type }) => [type, WorkflowNodeCard])
) as NodeTypes;

function layoutWithDagre(nodes: CanvasNode[], edges: Edge[]): CanvasNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100, marginx: 40, marginy: 40 });
  nodes.forEach((node) => g.setNode(node.id, { width: 256, height: 66 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return pos ? { ...node, position: { x: pos.x - 128, y: pos.y - 33 } } : node;
  });
}

function TemplatePicker({
  channel,
  value,
  onChange,
}: {
  channel: "EMAIL";
  value: string;
  onChange: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<WorkflowTemplate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWorkflowTemplates()
      .then((all) => {
        if (!cancelled) setTemplates(all.filter((t) => t.channel === channel));
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [channel]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Template</Label>
      <Select value={value || undefined} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={templates ? "Choose a template" : "Loading templates..."} />
        </SelectTrigger>
        <SelectContent>
          {(templates ?? []).map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
              {template.scope !== "PERSONAL" && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({template.scope === "TENANT" ? "org" : "community"})
                </span>
              )}
            </SelectItem>
          ))}
          {templates && templates.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No {channel} templates yet.</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function IntakeFormConfig({
  formTemplateId,
  onChange,
}: {
  formTemplateId: string;
  onChange: (patch: { formTemplateId?: string }) => void;
}) {
  const [templates, setTemplates] = useState<FormTemplate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFormTemplates()
      .then((all) => {
        if (!cancelled) setTemplates(all);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Form</Label>
        <Select
          value={formTemplateId || undefined}
          onValueChange={(next) => onChange({ formTemplateId: next ?? "" })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={templates ? "Choose a form" : "Loading forms..."} />
          </SelectTrigger>
          <SelectContent>
            {(templates ?? []).map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
            {templates && templates.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No intake forms yet.</p>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// A minimal form-template picker used by the TRIGGER node's FORM_SUBMITTED
// sub-config — just the form selector, no channel, no send-via controls.
function TriggerFormPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (formTemplateId: string) => void;
}) {
  const [templates, setTemplates] = useState<FormTemplate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFormTemplates()
      .then((all) => {
        if (!cancelled) setTemplates(all);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Which form</Label>
      <Select value={value || undefined} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={templates ? "Choose a form" : "Loading forms..."} />
        </SelectTrigger>
        <SelectContent>
          {(templates ?? []).map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
          {templates && templates.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No forms yet.</p>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The workflow starts when a client submits this form.
      </p>
    </div>
  );
}

function NodeConfigForm({
  node,
  onChange,
}: {
  node: CanvasNode;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const config = node.data.config;
  const set = (patch: Record<string, unknown>) => onChange({ ...config, ...patch });

  if (node.data.nodeType === "TRIGGER") {
    const triggerType = (config.triggerType as string) ?? "MANUAL";
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Trigger type</Label>
          <Select value={triggerType} onValueChange={(value) => set({ triggerType: value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual — run on demand</SelectItem>
              <SelectItem value="EVENT">Event — run when something happens</SelectItem>
              <SelectItem value="SCHEDULE">Schedule — run on a recurring time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {triggerType === "SCHEDULE" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cron">Cron expression</Label>
            <Input
              id="cron"
              value={(config.cron as string) ?? ""}
              onChange={(event) => set({ cron: event.target.value })}
              placeholder="0 9 * * *"
            />
          </div>
        )}
        {triggerType === "EVENT" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eventName">Run when</Label>
              <Select
                value={(config.eventName as string) || undefined}
                onValueChange={(value) =>
                  // Clear formTemplateId when switching away from FORM_SUBMITTED
                  set({
                    eventName: value,
                    formTemplateId:
                      value === "FORM_SUBMITTED" ? (config.formTemplateId ?? "") : undefined,
                  })
                }
              >
                <SelectTrigger id="eventName" className="w-full">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TRIGGER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(config.eventName as string) === "FORM_SUBMITTED" && (
              <TriggerFormPicker
                value={(config.formTemplateId as string) ?? ""}
                onChange={(formTemplateId) => set({ formTemplateId })}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  if (node.data.nodeType === "SEND_EMAIL") {
    const recipient = (config.recipient as string) ?? "CLIENT";
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Send to</Label>
          <Select value={recipient} onValueChange={(value) => set({ recipient: value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLIENT">Client</SelectItem>
              <SelectItem value="CONSULTANT">Consultant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TemplatePicker
          channel="EMAIL"
          value={(config.templateId as string) ?? ""}
          onChange={(templateId) => set({ templateId })}
        />
      </div>
    );
  }

  if (node.data.nodeType === "SEND_INTAKE_FORM") {
    return (
      <IntakeFormConfig
        formTemplateId={(config.formTemplateId as string) ?? ""}
        onChange={(patch) => set(patch)}
      />
    );
  }

  if (node.data.nodeType === "CREATE_TASK") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={(config.title as string) ?? ""}
            onChange={(event) => set({ title: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Assigned to</Label>
          <Select
            value={(config.assignedTo as string) ?? "CONSULTANT"}
            onValueChange={(value) => set({ assignedTo: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSULTANT">Consultant</SelectItem>
              <SelectItem value="CLIENT">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-due">Due in (minutes, optional)</Label>
          <Input
            id="task-due"
            type="number"
            value={(config.dueInMins as number) ?? ""}
            onChange={(event) =>
              set({ dueInMins: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>
    );
  }

  if (node.data.nodeType === "CREATE_COMMITMENT") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commitment-title">Title</Label>
          <Input
            id="commitment-title"
            value={(config.title as string) ?? ""}
            onChange={(event) => set({ title: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commitment-due">Due in (minutes, optional)</Label>
          <Input
            id="commitment-due"
            type="number"
            value={(config.dueInMins as number) ?? ""}
            onChange={(event) =>
              set({ dueInMins: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>
    );
  }

  if (node.data.nodeType === "WAIT") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wait-duration">Duration (minutes)</Label>
        <Input
          id="wait-duration"
          type="number"
          value={(config.durationMins as number) ?? ""}
          onChange={(event) => set({ durationMins: Number(event.target.value) })}
        />
      </div>
    );
  }

  if (node.data.nodeType === "CONDITION") {
    const operator = (config.operator as string) ?? "EXISTS";
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condition-field">Field</Label>
          <Input
            id="condition-field"
            value={(config.field as string) ?? ""}
            onChange={(event) => set({ field: event.target.value })}
            placeholder="appointment.status"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Operator</Label>
          <Select value={operator} onValueChange={(value) => set({ operator: value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EQUALS">Equals</SelectItem>
              <SelectItem value="NOT_EQUALS">Not equals</SelectItem>
              <SelectItem value="EXISTS">Exists</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {operator !== "EXISTS" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="condition-value">Value</Label>
            <Input
              id="condition-value"
              value={(config.value as string) ?? ""}
              onChange={(event) => set({ value: event.target.value })}
            />
          </div>
        )}
      </div>
    );
  }

  if (node.data.nodeType === "BRANCH") {
    const branches = (config.branches as { label: string; field: string; value: string }[]) ?? [];
    return (
      <div className="flex flex-col gap-4">
        {branches.map((branch, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Branch {index + 1}</Label>
              {branches.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ branches: branches.filter((_, i) => i !== index) })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Input
              value={branch.label}
              placeholder="Label"
              onChange={(event) =>
                set({
                  branches: branches.map((b, i) =>
                    i === index ? { ...b, label: event.target.value } : b
                  ),
                })
              }
            />
            <Input
              value={branch.field}
              placeholder="Field, e.g. appointment.status"
              onChange={(event) =>
                set({
                  branches: branches.map((b, i) =>
                    i === index ? { ...b, field: event.target.value } : b
                  ),
                })
              }
            />
            <Input
              value={branch.value}
              placeholder="Value"
              onChange={(event) =>
                set({
                  branches: branches.map((b, i) =>
                    i === index ? { ...b, value: event.target.value } : b
                  ),
                })
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            set({
              branches: [
                ...branches,
                { label: `Branch ${branches.length + 1}`, field: "", value: "" },
              ],
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add branch
        </Button>
      </div>
    );
  }

  // CUSTOM_ACTION — the escape hatch: pick any registered schema operation
  // and fill in its payload as free-form key/value pairs, merge-field tokens
  // like {{case.id}} included. New operations only ever need a new entry in
  // CUSTOM_ACTION_LABEL/CUSTOM_ACTION_OPERATIONS — this form never changes.
  const operation = (config.operation as CustomActionOperation) ?? CUSTOM_ACTION_OPERATIONS[0];
  const payload = (config.payload as Record<string, unknown>) ?? {};
  const payloadEntries = Object.entries(payload);

  function setPayloadEntry(index: number, key: string, value: string) {
    const next = [...payloadEntries];
    next[index] = [key, value];
    set({ payload: Object.fromEntries(next) });
  }

  function removePayloadEntry(index: number) {
    set({ payload: Object.fromEntries(payloadEntries.filter((_, i) => i !== index)) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Operation</Label>
        <Select value={operation} onValueChange={(value) => set({ operation: value, payload: {} })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CUSTOM_ACTION_OPERATIONS.map((op) => (
              <SelectItem key={op} value={op}>
                {CUSTOM_ACTION_LABEL[op].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Payload fields: {CUSTOM_ACTION_LABEL[operation].payloadHint}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Payload</Label>
        {payloadEntries.map(([key, value], index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={key}
              placeholder="field"
              className="w-1/3"
              onChange={(event) => setPayloadEntry(index, event.target.value, String(value ?? ""))}
            />
            <Input
              value={String(value ?? "")}
              placeholder="value or {{merge.field}}"
              onChange={(event) => setPayloadEntry(index, key, event.target.value)}
            />
            <button
              type="button"
              onClick={() => removePayloadEntry(index)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          onClick={() => set({ payload: { ...payload, "": "" } })}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      </div>
    </div>
  );
}

function CanvasInner({
  workflow,
  viewerRole,
  tenant,
}: {
  workflow: Workflow;
  viewerRole: "CONSULTANT" | "TENANT_ADMIN" | "SUPER_ADMIN";
  tenant?: WorkflowTenantParam;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const workflowsHref = pathname.slice(0, pathname.lastIndexOf("/")) || "/";
  const { screenToFlowPosition } = useReactFlow();

  // useRef keeps the store stable across re-renders; useState's lazy
  // initializer is also stable but can behave unexpectedly under React
  // Strict Mode's double-invocation.
  // Reset the store whenever the workflow id changes (e.g. navigating between
  // workflows) so we always start from the latest persisted graph.
  const storeRef = useRef<ReturnType<typeof createCanvasStore> | null>(null);
  const workflowIdRef = useRef<string | null>(null);
  if (!storeRef.current || workflowIdRef.current !== workflow.id) {
    storeRef.current = createCanvasStore(workflow.graph);
    workflowIdRef.current = workflow.id;
  }
  const useCanvasStore = storeRef.current;
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const removeSelected = useCanvasStore((s) => s.removeSelected);

  const [name, setName] = useState(workflow.name);
  const [status, setStatus] = useState<WorkflowStatus>(workflow.status);
  const [optedOut, setOptedOut] = useState(workflow.optedOut);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const SelectedIcon = selectedNode ? NODE_ICON[selectedNode.data.nodeType] : null;

  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => setNodes((prev) => applyNodeChanges(changes, prev)),
    [setNodes]
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((prev) => applyEdgeChanges(changes, prev)),
    [setEdges]
  );
  const handleConnect = useCallback(
    (connection: Connection) =>
      setEdges((prev) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            style: { stroke: "var(--border)", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
          },
          prev
        )
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(
        "application/workflow-node-type"
      ) as WorkflowNodeType;
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = nextNodeId(nodeType);
      const label = NODE_PALETTE.find((p) => p.type === nodeType)?.label ?? nodeType;
      const newNode: CanvasNode = {
        id,
        type: nodeType,
        position,
        data: { nodeType, label, config: defaultConfig(nodeType) },
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(id);
    },
    [screenToFlowPosition, setNodes, setSelectedNodeId]
  );

  function applyDagreLayout() {
    setNodes((prev) => layoutWithDagre(prev, edges));
  }

  function buildGraph(): WorkflowGraph {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source!,
        target: e.target!,
        sourceHandle: e.sourceHandle,
      })),
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateWorkflow(workflow.id, { name, graph: buildGraph() }, tenant);
      // Refresh server-component data so the page prop stays in sync with
      // what was just persisted (graph, name, status).
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }

  // Publishing from DRAFT is the only PUBLISHED transition that also needs
  // the graph saved alongside it — resuming from PAUSED is status-only, and
  // for a CONSULTANT on a TENANT/COMMUNITY workflow must stay status-only
  // too (bundling name/graph would make the API treat it as a content edit,
  // which requires requireWorkflowManagePermission separately from
  // requirePauseResumePermission, instead of an opt-out pause/resume).
  async function handleStatusChange(next: WorkflowStatus) {
    setError(null);
    const isPauseResume =
      (status === "PUBLISHED" && next === "PAUSED") ||
      (status === "PAUSED" && next === "PUBLISHED");
    try {
      if (status === "DRAFT" && next === "PUBLISHED") {
        await updateWorkflow(workflow.id, { name, graph: buildGraph(), status: next }, tenant);
      } else {
        await updateWorkflow(workflow.id, { status: next }, tenant);
      }
      // Pausing/resuming a TENANT/COMMUNITY workflow never flips
      // workflows.status (workflows.router.ts upserts/removes the caller's
      // own WorkflowOptOut row instead), so track that locally rather than
      // the shared status. Publishing from DRAFT and archiving (and a
      // PERSONAL owner's pause/resume) do flip real status.
      if (isPauseResume && workflow.scope !== "PERSONAL") {
        setOptedOut(next === "PAUSED");
      } else {
        setStatus(next);
      }
      // Refresh server-component data so the persisted status (and graph on
      // publish) is reflected in the page prop on the next render.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${next.toLowerCase()} workflow`);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      await runWorkflowNow(workflow.id, tenant);
      router.push(`${pathname}/runs`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      data-tour={
        viewerRole === "TENANT_ADMIN" ? "admin-workflow-canvas" : "consultant-workflow-canvas"
      }
      className="-m-5 flex h-[calc(100%+2.5rem)] flex-col overflow-hidden"
    >
      <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-background px-5 py-3">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href={workflowsHref} className="hover:text-foreground">
            Workflows
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-primary">{name}</span>
        </nav>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-8 w-56 border-none px-0 text-xl font-bold shadow-none focus-visible:ring-0"
            />
            <Badge
              variant="outline"
              className={cn(
                status === "PUBLISHED" && "border-emerald-600 text-emerald-600",
                status === "PAUSED" && "border-amber-500 text-amber-600",
                (status === "DRAFT" || status === "ARCHIVED") && "text-muted-foreground"
              )}
            >
              {status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`${pathname}/runs`)}>
              Runs
            </Button>
            {/* Everything below — running, saving, publishing, pausing,
                resuming, archiving — belongs to CONSULTANTs only from here
                on, never TENANT_ADMIN/SUPER_ADMIN (workflows.router.ts's
                requireWorkflowManagePermission / requirePauseResumePermission
                reject them outright once the workflow exists, regardless of
                who created it). PERSONAL is further restricted to its owning
                CONSULTANT. */}
            {(() => {
              const canManage =
                viewerRole === "CONSULTANT" &&
                (workflow.scope === "PERSONAL" ? workflow.isOwn : true);
              if (!canManage) return null;

              const isPauseResume = workflow.scope !== "PERSONAL";

              return (
                <>
                  {status === "PUBLISHED" && (
                    <Button variant="outline" size="sm" onClick={handleRunNow} disabled={running}>
                      {running ? "Starting..." : "Run now"}
                    </Button>
                  )}
                  {status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("PUBLISHED")}
                    >
                      Publish
                    </Button>
                  )}
                  {/* Pause/resume: for PERSONAL this flips real status; for a
                      shared TENANT/COMMUNITY workflow it's driven by the
                      caller's own optedOut flag instead — the API
                      upserts/removes their WorkflowOptOut row rather than
                      touching the shared status. */}
                  {isPauseResume ? (
                    status !== "ARCHIVED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(optedOut ? "PUBLISHED" : "PAUSED")}
                      >
                        {optedOut ? "Resume" : "Pause"}
                      </Button>
                    )
                  ) : (
                    <>
                      {status === "PUBLISHED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange("PAUSED")}
                        >
                          Pause
                        </Button>
                      )}
                      {status === "PAUSED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange("PUBLISHED")}
                        >
                          Resume
                        </Button>
                      )}
                    </>
                  )}
                  {status !== "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await handleStatusChange("ARCHIVED");
                        router.push(workflowsHref);
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {error && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-background p-3">
          {PALETTE_CATEGORIES.map((category) => (
            <div key={category} className="flex flex-col gap-1">
              <p className="px-1 pb-1 text-xs font-medium uppercase text-muted-foreground">
                {category}
              </p>
              {NODE_PALETTE.filter((item) => item.category === category).map(
                ({ type, label, icon }) => {
                  const Icon = NODE_ICON[icon];
                  return (
                    <div
                      key={type}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/workflow-node-type", type);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted active:cursor-grabbing"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {label}
                    </div>
                  );
                }
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-1 gap-1.5" onClick={applyDagreLayout}>
            Auto-layout
          </Button>
        </aside>

        <div
          className="min-w-0 flex-1"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="var(--border)"
            />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </div>

        {selectedNode && SelectedIcon && (
          <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-background">
            <div className="flex items-start justify-between gap-2 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <SelectedIcon className="h-4 w-4 text-foreground" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {selectedNode.data.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedNode.data.nodeType.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Delete node"
                  onClick={removeSelected}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Collapse panel"
                  onClick={() => setSelectedNodeId(null)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowRightToLine className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="px-5 pb-3 text-xs text-muted-foreground">
              {NODE_DESCRIPTION[selectedNode.data.nodeType]}
            </p>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <NodeConfigForm
                node={selectedNode}
                onChange={(config) => updateNodeConfig(selectedNode.id, config)}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export function WorkflowCanvas({
  workflow,
  viewerRole = "CONSULTANT",
  tenant,
}: {
  workflow: Workflow;
  viewerRole?: "CONSULTANT" | "TENANT_ADMIN" | "SUPER_ADMIN";
  tenant?: WorkflowTenantParam;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner workflow={workflow} viewerRole={viewerRole} tenant={tenant} />
    </ReactFlowProvider>
  );
}
