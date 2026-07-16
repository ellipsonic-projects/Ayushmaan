"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronRight, Plus } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createPlatformTenantCase } from "@/lib/api/platform-cases.client";

const CATEGORIES = ["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"];

const CATEGORY_LABEL: Record<string, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

export function CaseDirectoryHeader({
  tenantId,
  tenantSlug,
  tenantName,
  totalCases,
  clients,
  consultants,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  totalCases: number;
  clients: { id: string; fullName: string }[];
  consultants: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [matterKey, setMatterKey] = useState("");
  const [requirements, setRequirements] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setClientId(null);
    setConsultantId(null);
    setCategory(null);
    setMatterKey("");
    setRequirements("");
    setError(null);
  }

  async function handleCreate() {
    if (!clientId || !consultantId || !category) {
      setError("Client, consultant and category are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlatformTenantCase(tenantId, tenantSlug, {
        clientId,
        consultantId,
        category,
        matterKey: matterKey.trim() || undefined,
        requirements: requirements.trim() || undefined,
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/superadmin/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/superadmin/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Cases</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">Tenant Cases</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing {totalCases.toLocaleString()} cases for {tenantName}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Case
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Case</DialogTitle>
            <DialogDescription>Create a new case for {tenantName}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Consultant</Label>
              <Select value={consultantId} onValueChange={setConsultantId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select consultant" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="matter-key">Matter Key (optional)</Label>
              <Input
                id="matter-key"
                value={matterKey}
                onChange={(e) => setMatterKey(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements">Requirements (optional)</Label>
              <textarea
                id="requirements"
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={saving} />}>
              Cancel
            </DialogClose>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
