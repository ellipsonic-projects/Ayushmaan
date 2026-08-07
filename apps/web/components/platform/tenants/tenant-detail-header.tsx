"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  onApprove,
  onReject,
  onSave,
  dirty = false,
  saving = false,
}: {
  tenantId: string;
  name: string;
  status: "Pending" | "Active" | "Suspended" | "Rejected" | "Archived";
  onSuspend?: () => void | Promise<void>;
  onReinstate?: () => void | Promise<void>;
  onApprove?: () => void | Promise<void>;
  onReject?: (reason: string) => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  dirty?: boolean;
  saving?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function confirmStatusToggle() {
    setConfirmOpen(false);
    if (status === "Active") {
      await onSuspend?.();
    } else {
      await onReinstate?.();
    }
  }

  async function confirmReject() {
    if (!rejectReason.trim()) return;
    await onReject?.(rejectReason.trim());
    setRejectOpen(false);
    setRejectReason("");
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
        {status === "Pending" ? (
          <>
            <Button variant="outline" onClick={() => setRejectOpen(true)}>
              Reject Signup
            </Button>
            <Button onClick={() => onApprove?.()}>Approve Signup</Button>
          </>
        ) : status === "Active" || status === "Suspended" ? (
          <Button
            variant={status === "Active" ? "destructive" : "outline"}
            onClick={() => setConfirmOpen(true)}
          >
            {status === "Active" ? "Suspend Tenant" : "Reinstate Tenant"}
          </Button>
        ) : null}
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

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this signup?</DialogTitle>
            <DialogDescription>
              {name} will be notified with the reason below. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
