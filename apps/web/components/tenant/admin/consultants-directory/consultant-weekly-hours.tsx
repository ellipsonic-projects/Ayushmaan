import { CalendarClock } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConsultantAvailabilitySlot } from "@/lib/api/consultants.server";

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

// Read-only: recurring weekly hours are set org-wide from Settings
// (settings-form.tsx), never per-consultant here. The consultant can still
// block/reopen an individual slot with a reason from their own Availability page.
export function ConsultantWeeklyHours({ slots }: { slots: ConsultantAvailabilitySlot[] }) {
  const weeklySlots = slots.filter((s) => s.dayOfWeek !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Weekly Hours
        </CardTitle>
        <CardDescription>
          Recurring availability for this consultant, set org-wide from Settings. They can block an
          individual slot with a reason from their own Availability page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
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
                        "rounded-md border px-2 py-1.5 text-xs",
                        slot.status === "BOOKED"
                          ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                          : "border-border bg-muted/40"
                      )}
                    >
                      {formatTimeLabel(timeFromIso(slot.startTime))} &ndash;{" "}
                      {formatTimeLabel(timeFromIso(slot.endTime))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
