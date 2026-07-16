"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAppointment, assignConsultant } from "@/lib/api/appointments.client";
import { listConsultants, type ConsultantListItem } from "@/lib/api/consultants.client";
import { type PendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";

export type { PendingApprovalItem };

// Only action the Tenant Admin doesn't get inline here is a full reschedule
// picker — it opens a small start/end-time form instead of one button click,
// since a new time has to be supplied along with the transition.
type OpenPanel = "reject" | "reschedule" | null;

export function PendingApprovalsTable({ initialItems }: { initialItems: PendingApprovalItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<{ id: string; panel: OpenPanel } | null>(null);
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [consultants, setConsultants] = useState<ConsultantListItem[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.some((item) => item.consultantName === null)) {
      listConsultants().then(setConsultants);
    }
  }, [items]);

  function resetPanel() {
    setOpenPanel(null);
    setReason("");
    setNewStart("");
    setNewEnd("");
  }

  async function approve(id: string) {
    setPendingId(id);
    try {
      await updateAppointment(id, { status: "ADMIN_APPROVED" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  async function assign(item: PendingApprovalItem) {
    const consultantId = selectedConsultantId[item.id];
    if (!consultantId) return;
    setPendingId(item.id);
    try {
      await assignConsultant(item.caseId, consultantId);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    setPendingId(id);
    try {
      await updateAppointment(id, { status: "CANCELLED", cancellationReason: reason || undefined });
      setItems((prev) => prev.filter((item) => item.id !== id));
      resetPanel();
    } finally {
      setPendingId(null);
    }
  }

  async function proposeReschedule(id: string) {
    if (!newStart || !newEnd) return;
    setPendingId(id);
    try {
      await updateAppointment(id, {
        status: "RESCHEDULE_PROPOSED",
        scheduledStart: new Date(newStart).toISOString(),
        scheduledEnd: new Date(newEnd).toISOString(),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      resetPanel();
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
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.clientName} · {item.consultantName ?? "Awaiting consultant assignment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.consultantCategory} —{" "}
                      {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  </div>
                </div>
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
                  {item.consultantName === null ? (
                    <>
                      <Select
                        value={selectedConsultantId[item.id] ?? ""}
                        onValueChange={(value) =>
                          setSelectedConsultantId((prev) => ({ ...prev, [item.id]: value ?? "" }))
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue placeholder="Choose consultant" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultants
                            .filter((c) => c.category === item.consultantCategory)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.fullName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={pendingId === item.id || !selectedConsultantId[item.id]}
                        onClick={() => assign(item)}
                      >
                        Assign
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => approve(item.id)}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>

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
