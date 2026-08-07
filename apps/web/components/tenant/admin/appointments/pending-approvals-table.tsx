"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateAppointment, approveSeries } from "@/lib/api/appointments.client";
import { type PendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export type { PendingApprovalItem };

// Only action the Tenant Admin doesn't get inline here is a full reschedule
// picker — it opens a small start/end-time form instead of one button click,
// since a new time has to be supplied along with the transition.
type OpenPanel = "reject" | "reschedule" | null;

export function PendingApprovalsTable({ initialItems }: { initialItems: PendingApprovalItem[] }) {
  const slug = useTenantSlug();
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<{ id: string; panel: OpenPanel } | null>(null);
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  function resetPanel() {
    setOpenPanel(null);
    setReason("");
    setNewStart("");
    setNewEnd("");
  }

  async function approve(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await updateAppointment(id, { status: "ADMIN_APPROVED" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError({ id, message: err instanceof Error ? err.message : "Failed to approve" });
    } finally {
      setPendingId(null);
    }
  }

  // Sprint 3.4 — admin-approve every REQUESTED occurrence of this item's
  // series in one action, instead of clicking Approve per occurrence.
  async function approveWholeSeries(item: PendingApprovalItem) {
    if (!item.seriesId) return;
    setPendingId(item.id);
    setError(null);
    try {
      await approveSeries(item.seriesId);
      setItems((prev) => prev.filter((i) => i.seriesId !== item.seriesId));
    } catch (err) {
      setError({
        id: item.id,
        message: err instanceof Error ? err.message : "Failed to approve series",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await updateAppointment(id, { status: "CANCELLED", cancellationReason: reason || undefined });
      setItems((prev) => prev.filter((item) => item.id !== id));
      resetPanel();
    } catch (err) {
      setError({ id, message: err instanceof Error ? err.message : "Failed to reject" });
    } finally {
      setPendingId(null);
    }
  }

  async function proposeReschedule(id: string) {
    if (!newStart || !newEnd) return;
    setPendingId(id);
    setError(null);
    try {
      await updateAppointment(id, {
        status: "RESCHEDULE_PROPOSED",
        scheduledStart: new Date(newStart).toISOString(),
        scheduledEnd: new Date(newEnd).toISOString(),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      resetPanel();
    } catch (err) {
      setError({
        id,
        message: err instanceof Error ? err.message : "Failed to propose reschedule",
      });
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No appointments are waiting for approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const panelOpen = openPanel?.id === item.id ? openPanel.panel : null;
        return (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={`/${slug}/tenant/admin/appointments/${item.id}`}
                  className="flex items-start gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground underline-offset-2 hover:underline">
                      {item.clientName} · {item.consultantName ?? "Awaiting consultant assignment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.consultantCategory} —{" "}
                      <span suppressHydrationWarning>
                        {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")}
                      </span>
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === item.id}
                    onClick={() =>
                      setOpenPanel(
                        panelOpen === "reschedule" ? null : { id: item.id, panel: "reschedule" }
                      )
                    }
                  >
                    Propose Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === item.id}
                    onClick={() =>
                      setOpenPanel(panelOpen === "reject" ? null : { id: item.id, panel: "reject" })
                    }
                  >
                    Reject
                  </Button>
                  {item.seriesId && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => approveWholeSeries(item)}
                    >
                      Approve Series
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={pendingId === item.id}
                    onClick={() => approve(item.id)}
                  >
                    Approve
                  </Button>
                </div>
              </div>

              {error?.id === item.id && <p className="text-sm text-destructive">{error.message}</p>}

              {panelOpen === "reject" && (
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <Textarea
                    placeholder="Reason for rejecting (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetPanel}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => reject(item.id)}
                    >
                      Confirm Reject
                    </Button>
                  </div>
                </div>
              )}

              {panelOpen === "reschedule" && (
                <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    New start
                    <input
                      type="datetime-local"
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    New end
                    <input
                      type="datetime-local"
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetPanel}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={pendingId === item.id || !newStart || !newEnd}
                      onClick={() => proposeReschedule(item.id)}
                    >
                      Send Proposal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
