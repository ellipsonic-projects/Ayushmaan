"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createPlatformTenantClient } from "@/lib/api/platform-clients.client";

export function ClientDirectoryHeader({
  tenantId,
  tenantSlug,
  tenantName,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEmail("");
    setFullName("");
    setPhone("");
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await createPlatformTenantClient(tenantId, tenantSlug, {
        email,
        fullName,
        ...(phone && { phone }),
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Clients</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">Client Database</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing active portfolios and session history for {tenantName}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
        <Button className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Invite a new client to {tenantName}. They&apos;ll receive an email to set up their
              account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-full-name">Full Name</Label>
              <Input
                id="client-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-phone">Phone (optional)</Label>
              <PhoneInput
                id="client-phone"
                value={phone}
                onChange={(value) => setPhone(value ?? "")}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button disabled={!email || !fullName || saving} onClick={handleCreate}>
              {saving ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
