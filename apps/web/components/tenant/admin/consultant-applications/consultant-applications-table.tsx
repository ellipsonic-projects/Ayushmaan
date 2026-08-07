"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TenantConsultantApplication } from "@/lib/api/consultant-applications.server";
import {
  approveConsultantApplication,
  rejectConsultantApplication,
} from "@/lib/api/consultant-applications.client";

const categoryLabel: Record<string, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

const statusBadgeClass: Record<string, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export function ConsultantApplicationsTable({
  initialApplications,
}: {
  initialApplications: TenantConsultantApplication[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [pendingApprove, setPendingApprove] = useState<TenantConsultantApplication | null>(null);
  const [pendingReject, setPendingReject] = useState<TenantConsultantApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => applications.filter((a) => statusFilter === "all" || a.status === statusFilter),
    [applications, statusFilter]
  );

  async function confirmApprove() {
    if (!pendingApprove) return;
    setBusy(true);
    setError(null);
    try {
      await approveConsultantApplication(pendingApprove.id);
      setApplications((prev) =>
        prev.map((a) => (a.id === pendingApprove.id ? { ...a, status: "APPROVED" as const } : a))
      );
      setPendingApprove(null);
    } catch {
      setError("Failed to approve this application. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject() {
    if (!pendingReject) return;
    setBusy(true);
    setError(null);
    try {
      await rejectConsultantApplication(pendingReject.id, rejectionReason || undefined);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === pendingReject.id
            ? { ...a, status: "REJECTED" as const, rejectionReason: rejectionReason || null }
            : a
        )
      );
      setPendingReject(null);
      setRejectionReason("");
    } catch {
      setError("Failed to reject this application. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Consultant Applications</CardTitle>
        <CardAction>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Applicant</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Fee</th>
                <th className="py-2 pr-4 font-medium">Applied</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((application) => (
                <tr key={application.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-foreground">{application.user.email}</p>
                    {application.message && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                        “{application.message}”
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-foreground">
                    {categoryLabel[application.category] ?? application.category}
                    {application.subSpecialization ? ` · ${application.subSpecialization}` : ""}
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-foreground">
                    {application.currency} {Number(application.consultationFee).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(application.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={statusBadgeClass[application.status] ?? ""}>
                      {application.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    {application.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Approve application"
                          className="text-emerald-600 hover:text-emerald-700"
                          onClick={() => setPendingApprove(application)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Reject application"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingReject(application)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No applications match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>

      <Dialog
        open={pendingApprove !== null}
        onOpenChange={(open) => !open && setPendingApprove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this application?</DialogTitle>
            <DialogDescription>
              {pendingApprove?.user.email} will become a consultant under your organization. Their
              client account will be converted and they will gain the Consultant dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button disabled={busy} onClick={confirmApprove}>
              {busy ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingReject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingReject(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this application?</DialogTitle>
            <DialogDescription>
              {pendingReject?.user.email} will be notified. They can reapply later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rejection-reason">Reason (optional)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Let the applicant know why"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" disabled={busy} onClick={confirmReject}>
              {busy ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
