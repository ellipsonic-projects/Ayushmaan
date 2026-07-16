"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Star, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ConsultantProfile } from "@/lib/api/consultants.server";
import {
  updatePlatformTenantConsultant,
  deletePlatformTenantConsultant,
  setPlatformUserAccountStatus,
} from "@/lib/api/platform-consultants.client";

const CATEGORY_LABEL: Record<string, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => part !== "Dr.")
    .map((part) => part.charAt(0))
    .join("");
}

export function ConsultantsTable({
  tenantId,
  tenantSlug,
  consultants: initialConsultants,
}: {
  tenantId: string;
  tenantSlug: string;
  consultants: ConsultantProfile[];
}) {
  const router = useRouter();
  const [consultants, setConsultants] = useState(initialConsultants);
  const [editing, setEditing] = useState<ConsultantProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsultantProfile | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setConsultants((prev) => prev.filter((c) => c.id !== target.id));
    try {
      await deletePlatformTenantConsultant(tenantId, tenantSlug, target.id);
      router.refresh();
    } catch {
      setConsultants((prev) => [...prev, target]);
    }
  }

  async function reactivate(consultant: ConsultantProfile) {
    setConsultants((prev) =>
      prev.map((c) =>
        c.id === consultant.id ? { ...c, user: { ...c.user, accountStatus: "ACTIVE" } } : c
      )
    );
    try {
      await setPlatformUserAccountStatus(tenantId, tenantSlug, consultant.userId, "ACTIVE");
      router.refresh();
    } catch {
      setConsultants((prev) => prev.map((c) => (c.id === consultant.id ? consultant : c)));
    }
  }

  return (
    <Card size="sm">
      <CardContent className="px-0">
        <div className="max-h-112 overflow-auto px-4">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Total Cases</th>
                <th className="py-2 pr-4 font-medium">Avg Rating</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultants.map((consultant) => (
                <tr
                  key={consultant.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                        {initials(consultant.fullName)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{consultant.fullName}</p>
                        <p className="text-xs text-muted-foreground">{consultant.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-foreground">
                    {CATEGORY_LABEL[consultant.category] ?? consultant.category}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-foreground">
                    {consultant._count.cases.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1 tabular-nums text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(consultant.ratingAvg).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge
                      variant="outline"
                      className={
                        consultant.user.accountStatus === "ACTIVE"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                      }
                    >
                      {consultant.user.accountStatus}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${consultant.fullName}`}
                        onClick={() => setEditing(consultant)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {consultant.user.accountStatus === "ACTIVE" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${consultant.fullName}`}
                          onClick={() => setDeleteTarget(consultant)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Reactivate ${consultant.fullName}`}
                          onClick={() => reactivate(consultant)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>{consultants.length} consultants</span>
        </div>
      </CardContent>

      {editing && (
        <EditConsultantDialog
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          consultant={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setConsultants((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            router.refresh();
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this consultant?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.fullName} will be removed from public booking and their existing
              clients will be notified. This can be reversed by reactivating their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditConsultantDialog({
  tenantId,
  tenantSlug,
  consultant,
  onClose,
  onSaved,
}: {
  tenantId: string;
  tenantSlug: string;
  consultant: ConsultantProfile;
  onClose: () => void;
  onSaved: (updated: ConsultantProfile) => void;
}) {
  const [fullName, setFullName] = useState(consultant.fullName);
  const [subSpecialization, setSubSpecialization] = useState(consultant.subSpecialization ?? "");
  const [bio, setBio] = useState(consultant.bio ?? "");
  const [consultationFee, setConsultationFee] = useState(consultant.consultationFee);
  const [currency, setCurrency] = useState(consultant.currency);
  const [languagesSpoken, setLanguagesSpoken] = useState(consultant.languagesSpoken.join(", "));
  const [isAcceptingNewClients, setIsAcceptingNewClients] = useState(
    consultant.isAcceptingNewClients
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updatePlatformTenantConsultant(tenantId, tenantSlug, consultant.id, {
        fullName: fullName.trim(),
        subSpecialization: subSpecialization.trim(),
        bio: bio.trim(),
        consultationFee: Number(consultationFee),
        currency,
        languagesSpoken: languagesSpoken
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        isAcceptingNewClients,
      });
      onSaved({
        ...consultant,
        fullName: fullName.trim(),
        subSpecialization: subSpecialization.trim() || null,
        bio: bio.trim() || null,
        consultationFee: String(consultationFee),
        currency,
        languagesSpoken: languagesSpoken
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        isAcceptingNewClients,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save consultant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Consultant</DialogTitle>
          <DialogDescription>Update {consultant.fullName}&apos;s profile.</DialogDescription>
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
            <Label htmlFor="edit-sub-specialization">Sub-specialization</Label>
            <Input
              id="edit-sub-specialization"
              value={subSpecialization}
              onChange={(e) => setSubSpecialization(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-bio">Bio</Label>
            <textarea
              id="edit-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-consultation-fee">Consultation Fee</Label>
              <Input
                id="edit-consultation-fee"
                type="number"
                min={0}
                step="0.01"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? currency)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-languages">Languages Spoken</Label>
            <Input
              id="edit-languages"
              placeholder="English, Hindi"
              value={languagesSpoken}
              onChange={(e) => setLanguagesSpoken(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-accepting-clients" className="text-sm font-medium text-foreground">
              Accepting New Clients
            </Label>
            <Switch
              id="edit-accepting-clients"
              checked={isAcceptingNewClients}
              onCheckedChange={setIsAcceptingNewClients}
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
