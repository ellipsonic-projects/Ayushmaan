"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  ConsultantAvailabilitySlot,
  ClientVisibleAvailabilitySlot,
} from "@/lib/api/consultants.server";
import { deleteAvailabilitySlot } from "@/lib/api/consultants.client";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeFromIso(value: string) {
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function formatTimeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// clientVisibleSlots' `start` is the absolute instant generateDiscreteAvailability
// computed server-side from the template's Time-column hour/minute read via
// UTC getters — read it back the same way book-appointment-flow.tsx does, so
// this preview never disagrees with what the client actually sees.
function formatSlotTime(iso: string): string {
  return formatTimeLabel(timeFromIso(iso));
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// Groups the discrete client-visible slots by day for the preview, same
// dateKey grouping book-appointment-flow.tsx uses.
function groupSlotsByDate(slots: ClientVisibleAvailabilitySlot[]) {
  const byDate = new Map<string, ClientVisibleAvailabilitySlot[]>();
  for (const slot of slots) {
    const bucket = byDate.get(slot.dateKey) ?? [];
    bucket.push(slot);
    byDate.set(slot.dateKey, bucket);
  }
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
}

// Removing any slot a consultant doesn't own the decision on (weekly hours
// are set by the tenant admin; date overrides are still the consultant's
// own) requires a reason — enforced server-side, prompted here.
function RemoveSlotDialog({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Remove slot"
        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this slot?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for overriding this slot (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!reason.trim() || submitting}
              onClick={handleConfirm}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsultantAvailabilityView({
  timezone,
  slots,
  clientVisibleSlots,
}: {
  timezone: string;
  slots: ConsultantAvailabilitySlot[];
  clientVisibleSlots: ClientVisibleAvailabilitySlot[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const weeklySlots = slots.filter((s) => s.dayOfWeek !== null);
  const overrideSlots = slots
    .filter((s) => s.specificDate !== null)
    .sort((a, b) => (a.specificDate! < b.specificDate! ? -1 : 1));

  // Capped to the next 14 days with slots so this stays a quick preview
  // rather than dumping the full 90-day booking window onto the page.
  const slotsByDate = useMemo(
    () => groupSlotsByDate(clientVisibleSlots).slice(0, 14),
    [clientVisibleSlots]
  );

  async function handleDelete(slotId: string, reason: string) {
    setError(null);
    try {
      await deleteAvailabilitySlot(slotId, { reason });
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message.includes("409")) {
        setError("This slot is already booked. Refresh and try again with force if needed.");
      } else {
        setError("Could not remove slot.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Weekly Hours
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set by your tenant admin. You can block a slot with a reason if you need to step away.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const daySlots = weeklySlots
              .filter((s) => s.dayOfWeek === dayOfWeek)
              .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
            return (
              <div key={label} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <div className="flex flex-col gap-1.5">
                  {daySlots.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hours set</p>
                  )}
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs",
                        slot.status === "BOOKED"
                          ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                          : "border-border bg-muted/40"
                      )}
                    >
                      <span>
                        {formatTimeLabel(timeFromIso(slot.startTime))} &ndash;{" "}
                        {formatTimeLabel(timeFromIso(slot.endTime))}
                      </span>
                      <RemoveSlotDialog onConfirm={(reason) => handleDelete(slot.id, reason)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Date Overrides
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overrideSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No date overrides.</p>
          ) : (
            overrideSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
              >
                <span>
                  {slot.specificDate!.slice(0, 10)} &middot;{" "}
                  {formatTimeLabel(timeFromIso(slot.startTime))}
                  &ndash;{formatTimeLabel(timeFromIso(slot.endTime))}
                </span>
                <RemoveSlotDialog onConfirm={(reason) => handleDelete(slot.id, reason)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming Bookable Slots &middot; {timezone}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            The exact slots clients can currently pick when booking with you — already split into
            individual time slots and excluding anything booked or past the booking cutoff.
          </p>
          {slotsByDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open slots to book right now.</p>
          ) : (
            slotsByDate.map(([dateKey, daySlots]) => (
              <div key={dateKey} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {formatDateLabel(dateKey)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {daySlots.map((slot) => (
                    <span
                      key={slot.start}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                    >
                      {formatSlotTime(slot.start)} &middot; {slot.durationMins}m
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
