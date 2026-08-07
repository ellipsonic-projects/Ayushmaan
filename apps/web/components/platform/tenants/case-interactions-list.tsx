"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { PlatformInteraction } from "@/lib/api/platform-interactions.server";
import {
  createPlatformCaseInteraction,
  updatePlatformCaseInteraction,
  deletePlatformCaseInteraction,
} from "@/lib/api/platform-interactions.client";

const TYPES: PlatformInteraction["type"][] = [
  "SESSION_NOTE",
  "AD_HOC_NOTE",
  "CALL_LOG",
  "MESSAGE_LOG",
];

const TYPE_LABEL: Record<PlatformInteraction["type"], string> = {
  SESSION_NOTE: "Session Note",
  AD_HOC_NOTE: "Ad Hoc Note",
  CALL_LOG: "Call Log",
  MESSAGE_LOG: "Message Log",
};

export function CaseInteractionsList({
  interactions: initialInteractions,
  tenantId,
  tenantSlug,
  caseId,
}: {
  interactions: PlatformInteraction[];
  tenantId: string;
  tenantSlug: string;
  caseId: string;
}) {
  const router = useRouter();
  const [interactions, setInteractions] = useState(initialInteractions);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformInteraction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformInteraction | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlatformCaseInteraction(tenantId, tenantSlug, caseId, deleteTarget.id);
      setInteractions((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Interactions
          </CardTitle>
          <CardDescription>Session notes, calls and messages logged on this case.</CardDescription>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {interactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No interactions yet.</p>
        ) : (
          interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TYPE_LABEL[interaction.type]}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {interaction.isClientVisible ? (
                      <>
                        <Eye className="h-3 w-3" /> Client visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Internal only
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm text-foreground">{interaction.notes ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(interaction.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit interaction"
                  onClick={() => setEditing(interaction)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete interaction"
                  onClick={() => setDeleteTarget(interaction)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {createOpen && (
        <CreateInteractionDialog
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          caseId={caseId}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setInteractions((prev) => [created, ...prev]);
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditInteractionDialog
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          caseId={caseId}
          interaction={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setInteractions((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this interaction?</DialogTitle>
            <DialogDescription>This note will be removed from the case.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleting} />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateInteractionDialog({
  tenantId,
  tenantSlug,
  caseId,
  onClose,
  onCreated,
}: {
  tenantId: string;
  tenantSlug: string;
  caseId: string;
  onClose: () => void;
  onCreated: (interaction: PlatformInteraction) => void;
}) {
  const [type, setType] = useState<PlatformInteraction["type"]>("SESSION_NOTE");
  const [notes, setNotes] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!notes.trim()) {
      setError("Notes are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = (await createPlatformCaseInteraction(tenantId, tenantSlug, caseId, {
        type,
        notes: notes.trim(),
        isClientVisible,
      })) as PlatformInteraction;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add interaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Interaction</DialogTitle>
          <DialogDescription>Log a note against this case.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType((v as typeof type) ?? type)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-notes">Notes</Label>
            <textarea
              id="create-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="create-visible" className="text-sm font-medium text-foreground">
              Client Visible
            </Label>
            <Switch
              id="create-visible"
              checked={isClientVisible}
              onCheckedChange={setIsClientVisible}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancel</DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Adding..." : "Add Interaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditInteractionDialog({
  tenantId,
  tenantSlug,
  caseId,
  interaction,
  onClose,
  onSaved,
}: {
  tenantId: string;
  tenantSlug: string;
  caseId: string;
  interaction: PlatformInteraction;
  onClose: () => void;
  onSaved: (updated: PlatformInteraction) => void;
}) {
  const [notes, setNotes] = useState(interaction.notes ?? "");
  const [isClientVisible, setIsClientVisible] = useState(interaction.isClientVisible);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updatePlatformCaseInteraction(tenantId, tenantSlug, caseId, interaction.id, {
        notes: notes.trim(),
        isClientVisible,
      });
      onSaved({ ...interaction, notes: notes.trim(), isClientVisible });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Interaction</DialogTitle>
          <DialogDescription>{TYPE_LABEL[interaction.type]}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <textarea
              id="edit-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-visible" className="text-sm font-medium text-foreground">
              Client Visible
            </Label>
            <Switch
              id="edit-visible"
              checked={isClientVisible}
              onCheckedChange={setIsClientVisible}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
