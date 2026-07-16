"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function TenantDetailHeader({
  tenantId,
  name,
  status,
  onSuspend,
  onReinstate,
  onSave,
  dirty = false,
  saving = false,
}: {
  tenantId: string;
  name: string;
  status: "Active" | "Suspended";
  onSuspend?: () => void | Promise<void>;
  onReinstate?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  dirty?: boolean;
  saving?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function confirmStatusToggle() {
    setConfirmOpen(false);
    if (status === "Active") {
      await onSuspend?.();
    } else {
      await onReinstate?.();
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{tenantId}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">{name}</h2>
          <Badge variant={status === "Active" ? "default" : "destructive"} className="uppercase">
            {status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Audit Log
        </Button>
        <Button
          variant={status === "Active" ? "destructive" : "outline"}
          onClick={() => setConfirmOpen(true)}
        >
          {status === "Active" ? "Suspend Tenant" : "Reinstate Tenant"}
        </Button>
        <Button disabled={!dirty || saving} onClick={() => onSave?.()}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status === "Active" ? "Suspend this tenant?" : "Reinstate this tenant?"}
            </DialogTitle>
            <DialogDescription>
              {status === "Active"
                ? `${name} and all of its users will lose access immediately. This can be reversed at any time.`
                : `${name} will regain full access to the platform.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant={status === "Active" ? "destructive" : "default"}
              onClick={confirmStatusToggle}
            >
              {status === "Active" ? "Suspend" : "Reinstate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
