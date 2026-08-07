"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RemindersPanel } from "@/components/tenant/shared/workflows/reminders-panel";
import { cn } from "@/lib/utils";
import type {
  WorkflowListItem,
  WorkflowScope,
  WorkflowTriggerType,
} from "@/lib/api/workflows.server";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
  type WorkflowTenantParam,
} from "@/lib/api/workflows.client";

const STATUS_BADGE: Record<WorkflowListItem["status"], string> = {
  DRAFT: "border-border bg-transparent text-muted-foreground",
  PUBLISHED: "bg-emerald-600 text-white hover:bg-emerald-600",
  PAUSED: "border-amber-500 text-amber-600",
  ARCHIVED: "border-border bg-transparent text-muted-foreground",
};

const TRIGGER_LABEL: Record<WorkflowTriggerType, string> = {
  SCHEDULE: "Schedule",
  EVENT: "Event",
  MANUAL: "Manual",
};

const SCOPE_LABEL: Record<WorkflowScope, string> = {
  PERSONAL: "Personal",
  TENANT: "Organization",
  COMMUNITY: "Community",
};

function formatLastRun(lastRun: WorkflowListItem["lastRun"]) {
  if (!lastRun) return "Never run";
  const date = new Date(lastRun.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${lastRun.status} · ${date}`;
}

export function WorkflowsBoard({
  initialWorkflows,
  viewerRole = "CONSULTANT",
  tenant,
}: {
  initialWorkflows: WorkflowListItem[];
  // Each role is locked to exactly one scope at creation — CONSULTANT
  // always PERSONAL, TENANT_ADMIN always TENANT (organization), SUPER_ADMIN
  // always COMMUNITY (workflows.router.ts's POST handler forces this
  // regardless of what's sent) — so the scope picker below is just
  // explanatory text, not a real choice, for every role.
  viewerRole?: "CONSULTANT" | "TENANT_ADMIN" | "SUPER_ADMIN";
  // Explicit tenant context for the SUPER_ADMIN cross-tenant view
  // (/superadmin/tenants/:id/workflows); omitted elsewhere, where the
  // CONSULTANT/TENANT_ADMIN's own home tenant is resolved automatically.
  tenant?: WorkflowTenantParam;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>("MANUAL");
  const defaultScope: WorkflowScope =
    viewerRole === "TENANT_ADMIN"
      ? "TENANT"
      : viewerRole === "SUPER_ADMIN"
        ? "COMMUNITY"
        : "PERSONAL";
  const [scope, setScope] = useState<WorkflowScope>(defaultScope);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  function openCanvas(workflowId: string) {
    const base = `${pathname.replace(/\/$/, "")}/${workflowId}`;
    // The tenant-nested SUPER_ADMIN page (/superadmin/tenants/:id/workflows)
    // already resolves its tenant from the :id path segment, so this query
    // param is extra there. The top-level /superadmin/workflows page needs
    // no tenant at all (its workflows are tenant_id null) — its canvas
    // route hardcodes tenant="platform" itself, no query param needed.
    const query =
      tenant && typeof tenant === "object"
        ? `?tenantId=${encodeURIComponent(tenant.tenantId)}${
            tenant.tenantSlug ? `&tenantSlug=${encodeURIComponent(tenant.tenantSlug)}` : ""
          }`
        : "";
    router.push(`${base}${query}`);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const created = await createWorkflow({ name: trimmed, triggerType, scope }, tenant);
      setWorkflows((prev) => [{ ...created, lastRun: null }, ...prev]);
      setName("");
      setTriggerType("MANUAL");
      setScope(defaultScope);
      setOpen(false);
      openCanvas(created.id);
    } finally {
      setCreating(false);
    }
  }

  // Pause/resume/archive from the list, mirroring workflow-canvas.tsx's
  // handleStatusChange — same PATCH (workflows.router.ts's
  // requirePauseResumePermission for pause/resume, requireWorkflowManagePermission
  // for archive), just without opening the canvas first. Pausing/resuming a
  // TENANT/COMMUNITY workflow doesn't flip workflows.status at all — the API
  // upserts/removes the caller's own WorkflowOptOut row instead, so update
  // optedOut here rather than status; archiving (and a PERSONAL owner's
  // pause/resume) does flip real status, since only PAUSE_RESUME_TRANSITIONS
  // ("PUBLISHED"<->"PAUSED") route through the opt-out path server-side —
  // archive is a different transition entirely.
  async function handleStatusChange(workflow: WorkflowListItem, next: WorkflowListItem["status"]) {
    if (statusUpdating) return;
    setStatusUpdating(workflow.id);
    try {
      const updated = await updateWorkflow(workflow.id, { status: next }, tenant);
      const isPauseResume = next === "PAUSED" || next === "PUBLISHED";
      if (isPauseResume && workflow.scope !== "PERSONAL") {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflow.id ? { ...w, optedOut: next === "PAUSED" } : w))
        );
      } else {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflow.id ? { ...w, status: updated.status } : w))
        );
      }
    } finally {
      setStatusUpdating(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteWorkflow(deleteTarget.id, tenant);
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Tabs defaultValue="workflows" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Workflows</h2>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </div>
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="workflows" className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {workflows.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No workflows yet.
              </p>
            )}
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => openCanvas(workflow.id)}
                className="flex cursor-pointer flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{workflow.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TRIGGER_LABEL[workflow.triggerType]} trigger ·{" "}
                    {formatLastRun(workflow.lastRun)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {workflow.scope !== "PERSONAL" && (
                    <Badge variant="outline">{SCOPE_LABEL[workflow.scope]}</Badge>
                  )}
                  <Badge className={cn(STATUS_BADGE[workflow.status])}>{workflow.status}</Badge>
                  {/* Once created, TENANT_ADMIN/SUPER_ADMIN have no further
                      control over the workflow they created — running,
                      saving, pausing, resuming, and archiving all belong to
                      CONSULTANTs from here on (workflows.router.ts's
                      requireWorkflowManagePermission /
                      requirePauseResumePermission). PERSONAL stays owner
                      (the creating CONSULTANT) only. For TENANT/COMMUNITY, a
                      CONSULTANT's pause/resume is personal (their own
                      WorkflowOptOut row) rather than the shared status. */}
                  {viewerRole === "CONSULTANT" &&
                    (() => {
                      const isPersonalOwner = workflow.scope === "PERSONAL" && workflow.isOwn;

                      if (isPersonalOwner) {
                        if (workflow.status === "PUBLISHED") {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              disabled={statusUpdating === workflow.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(workflow, "PAUSED");
                              }}
                            >
                              Pause
                            </Button>
                          );
                        }
                        if (workflow.status === "PAUSED") {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              disabled={statusUpdating === workflow.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(workflow, "PUBLISHED");
                              }}
                            >
                              Resume
                            </Button>
                          );
                        }
                        return null;
                      }

                      if (workflow.scope !== "PERSONAL" && workflow.status !== "ARCHIVED") {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={statusUpdating === workflow.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(
                                workflow,
                                workflow.optedOut ? "PUBLISHED" : "PAUSED"
                              );
                            }}
                          >
                            {workflow.optedOut ? "Resume" : "Pause"}
                          </Button>
                        );
                      }

                      return null;
                    })()}
                  {viewerRole === "CONSULTANT" &&
                    (workflow.scope === "PERSONAL" ? workflow.isOwn : true) &&
                    workflow.status !== "ARCHIVED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={statusUpdating === workflow.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(workflow, "ARCHIVED");
                        }}
                      >
                        Archive
                      </Button>
                    )}
                  {/* Delete: SUPER_ADMIN may delete any scope; TENANT_ADMIN
                      may additionally delete a consultant's PERSONAL
                      workflow (never TENANT/COMMUNITY, including their own
                      TENANT-scoped creation) within their own tenant.
                      Nobody else can delete a workflow at all
                      (workflows.router.ts's DELETE handler). */}
                  {(viewerRole === "SUPER_ADMIN" ||
                    (viewerRole === "TENANT_ADMIN" && workflow.scope === "PERSONAL")) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(workflow);
                      }}
                      aria-label={`Delete ${workflow.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reminders">
        <RemindersPanel />
      </TabsContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workflow</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Send intake"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Trigger</Label>
              <Select
                value={triggerType}
                onValueChange={(value) => setTriggerType(value as WorkflowTriggerType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="SCHEDULE">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {viewerRole === "TENANT_ADMIN" ? (
              <div className="flex flex-col gap-1.5">
                <Label>Scope</Label>
                <p className="text-sm text-muted-foreground">
                  Organization — visible to every consultant in your tenant.
                </p>
              </div>
            ) : viewerRole === "SUPER_ADMIN" ? (
              <div className="flex flex-col gap-1.5">
                <Label>Scope</Label>
                <p className="text-sm text-muted-foreground">
                  Community — usable across every tenant on the platform.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>Scope</Label>
                <p className="text-sm text-muted-foreground">Personal — visible only to you.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete workflow?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={deleting}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
