"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRightToLine,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronRightIcon,
  FilePlus2,
  Folder,
  IdCard,
  Mail,
  MessageSquareText,
  ToggleLeft,
  ToggleRight,
  X,
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

type StepKind = "trigger" | "action";

type StepData = {
  kind: StepKind;
  step: number;
  icon: keyof typeof stepIcons;
  title: string;
  subtitle?: string;
  configured: boolean;
  [key: string]: unknown;
};

type StepNode = Node<StepData, "step">;

const stepIcons = {
  idCard: IdCard,
  filePlus: FilePlus2,
  mail: Mail,
  sms: MessageSquareText,
};

const initialNodes: StepNode[] = [
  {
    id: "trigger",
    type: "step",
    position: { x: 250, y: 0 },
    data: {
      kind: "trigger",
      step: 1,
      icon: "idCard",
      title: "When",
      subtitle: "A client is created",
      configured: true,
    },
  },
  {
    id: "forms",
    type: "step",
    position: { x: 250, y: 170 },
    data: {
      kind: "action",
      step: 2,
      icon: "filePlus",
      title: "Choose forms and agreements",
      configured: true,
    },
  },
  {
    id: "email",
    type: "step",
    position: { x: 60, y: 340 },
    data: {
      kind: "action",
      step: 3,
      icon: "mail",
      title: "Send email",
      configured: true,
    },
  },
  {
    id: "sms",
    type: "step",
    position: { x: 440, y: 340 },
    data: {
      kind: "action",
      step: 4,
      icon: "sms",
      title: "Send SMS",
      configured: true,
    },
  },
];

const edgeStyle = {
  type: "smoothstep" as const,
  style: { stroke: "var(--border)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
};

const initialEdges: Edge[] = [
  { id: "trigger-forms", source: "trigger", target: "forms", ...edgeStyle },
  { id: "forms-email", source: "forms", target: "email", ...edgeStyle },
  { id: "forms-sms", source: "forms", target: "sms", ...edgeStyle },
];

function StepNodeCard({ data, selected }: NodeProps<StepNode>) {
  const Icon = stepIcons[data.icon];
  return (
    <div className="relative">
      <Badge
        variant="outline"
        className={cn(
          "absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 gap-1 border-primary bg-background px-2 text-[10px] font-medium text-primary"
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        {data.kind === "trigger" ? "Trigger" : "Action"} &middot; Step {data.step}
      </Badge>
      <div
        className={cn(
          "flex w-64 items-center gap-3 rounded-lg border bg-background px-3 py-3 pt-4 shadow-sm transition-colors",
          selected ? "border-primary ring-2 ring-primary/20" : "border-border"
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{data.title}</p>
          {data.subtitle && (
            <p className="truncate text-xs text-muted-foreground">{data.subtitle}</p>
          )}
        </div>
        {data.configured && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <Handle type="target" position={Position.Top} className="h-0! w-0! border-0! bg-transparent!" />
      <Handle type="source" position={Position.Bottom} className="h-0! w-0! border-0! bg-transparent!" />
    </div>
  );
}

const nodeTypes: NodeTypes = { step: StepNodeCard };

function StepSettings({ nodeId }: { nodeId: string }) {
  if (nodeId === "trigger") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>Trigger</Label>
        <Select defaultValue="client-created">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client-created">A client is created</SelectItem>
            <SelectItem value="appointment-booked">An appointment is booked</SelectItem>
            <SelectItem value="form-submitted">A form is submitted</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (nodeId === "forms") {
    return (
      <div className="flex flex-col gap-4">
        <h4 className="text-base font-semibold text-foreground">Forms and agreements</h4>
        <div className="flex flex-col gap-1.5">
          <Label className="font-normal text-muted-foreground">
            Choose forms and agreements
          </Label>
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 rounded-lg border border-input px-2 text-sm transition-colors hover:border-ring"
          >
            <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              Intake (0)
              <Badge className="px-1.5 py-0 text-[10px]">Default</Badge>
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  if (nodeId === "email") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-subject">Subject</Label>
          <Input id="email-subject" defaultValue="Your intake forms" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-body">Message</Label>
          <textarea
            id="email-body"
            rows={6}
            defaultValue="Hi {{client_first_name}}, please complete the attached forms before your first appointment."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="sms-body">Message</Label>
      <textarea
        id="sms-body"
        rows={4}
        defaultValue="Hi {{client_first_name}}, your intake forms are ready. Check your email to complete them."
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}

export function WorkflowBuilder({ title = "Send intake" }: { title?: string }) {
  const pathname = usePathname();
  const workflowsHref = pathname.slice(0, pathname.lastIndexOf("/")) || "/";

  const [nodes, setNodes] = useState(initialNodes);
  const [selectedId, setSelectedId] = useState<string | null>("forms");
  const [active, setActive] = useState(false);
  const selected = nodes.find((node) => node.id === selectedId);
  const SelectedIcon = selected ? stepIcons[selected.data.icon] : null;

  const handleNodesChange = useCallback(
    (changes: NodeChange<StepNode>[]) => setNodes((prev) => applyNodeChanges(changes, prev)),
    []
  );

  return (
    <div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-background px-5 py-3">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href={workflowsHref} className="hover:text-foreground">
            Workflows
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-primary">{title}</span>
        </nav>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <IdCard className="h-4 w-4 text-foreground" />
            </span>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <Badge
              variant="outline"
              className={cn(active ? "border-emerald-600 text-emerald-600" : "text-muted-foreground")}
            >
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-primary hover:text-primary"
              onClick={() => setActive((value) => !value)}
            >
              {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {active ? "Deactivate workflow" : "Activate workflow"}
            </Button>
            <Button size="sm" variant="outline" disabled>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesConnectable={false}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="var(--border)" />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </div>

        {selected && SelectedIcon && (
          <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-background">
            <div className="flex items-start justify-between gap-2 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <SelectedIcon className="h-4 w-4 text-foreground" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selected.data.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selected.data.kind === "trigger" ? "Trigger" : "Action"} &middot; Step {selected.data.step}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Collapse panel"
                onClick={() => setSelectedId(null)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowRightToLine className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <StepSettings nodeId={selected.id} />
            </div>

            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <Button variant="outline" className="flex-1">
                Preview
              </Button>
              <Button className="flex-1" disabled>
                Save
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
