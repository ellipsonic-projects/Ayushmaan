"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
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
import type { TenantClient } from "@/lib/api/clients.server";
import {
  updatePlatformTenantClient,
  deletePlatformTenantClient,
} from "@/lib/api/platform-clients.client";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function ClientsTable({
  clients: initialClients,
  tenantId,
  tenantSlug,
}: {
  clients: TenantClient[];
  tenantId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [editTarget, setEditTarget] = useState<TenantClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantClient | null>(null);
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEdit(client: TenantClient) {
    setEditTarget(client);
    setFullName(client.fullName);
    setPreferredLanguage(client.preferredLanguage ?? "");
    setTimezone("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updatePlatformTenantClient(tenantId, tenantSlug, editTarget.id, {
        fullName,
        preferredLanguage,
        timezone,
        emergencyContactName,
        emergencyContactPhone,
      });
      setEditTarget(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    setClients((prev) => prev.filter((c) => c.id !== target.id));
    setDeleteTarget(null);
    try {
      await deletePlatformTenantClient(tenantId, tenantSlug, target.id);
      router.refresh();
    } catch {
      setClients((prev) => [...prev, target]);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card size="sm">
      <CardContent className="px-0">
        <div className="max-h-112 overflow-auto px-4">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Client Name</th>
                <th className="py-2 pr-4 font-medium">Contact Details</th>
                <th className="py-2 pr-4 font-medium">Assigned Consultant</th>
                <th className="py-2 pr-4 font-medium">CRM Tags</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const tags = Array.from(new Set(client.cases.flatMap((c) => c.tags)));
                const consultantNames = Array.from(
                  new Set(client.cases.map((c) => c.consultant.fullName))
                );
                return (
                  <tr
                    key={client.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          {initials(client.fullName)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{client.fullName}</p>
                          <p className="text-xs text-muted-foreground">ID: {client.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <p className="text-foreground">{client.user.email}</p>
                      <p className="text-xs text-muted-foreground">{client.user.phone ?? "—"}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">
                      {consultantNames.length > 0 ? consultantNames.join(", ") : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {tags.length > 0 ? (
                          tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${client.fullName}`}
                          onClick={() => openEdit(client)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${client.fullName}`}
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>{clients.length} clients</span>
        </div>
      </CardContent>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update {editTarget?.fullName}&apos;s profile.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-full-name">Full Name</Label>
              <Input
                id="edit-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-preferred-language">Preferred Language</Label>
              <Select
                value={preferredLanguage}
                onValueChange={(value) => value && setPreferredLanguage(value)}
              >
                <SelectTrigger id="edit-preferred-language" className="h-9 w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-timezone">Timezone</Label>
              <Input
                id="edit-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-emergency-name">Emergency Contact Name</Label>
              <Input
                id="edit-emergency-name"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-emergency-phone">Emergency Contact Phone</Label>
              <PhoneInput
                id="edit-emergency-phone"
                value={emergencyContactPhone}
                onChange={(value) => setEmergencyContactPhone(value ?? "")}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button disabled={!fullName || saving} onClick={handleSaveEdit}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this client?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.fullName} will be suspended and lose access to their account. Their
              case history is preserved. This can be reversed by reactivating their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
