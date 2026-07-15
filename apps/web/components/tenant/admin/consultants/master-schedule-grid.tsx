import { AlertTriangle, Clock3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const START_HOUR = 8;
const END_HOUR = 19;
const ROW_HEIGHT = 56;

export type Variant = "default" | "conflict" | "overtime";

export type ScheduleEvent = {
  id: string;
  title: string;
  time: string;
  start: number;
  end: number;
  variant: Variant;
  tag?: string;
};

export type ScheduleConsultant = {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarClass: string;
  events: ScheduleEvent[];
};

const variantClass: Record<Variant, string> = {
  default:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  conflict:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  overtime:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

function hourLabel(hour: number) {
  const period = hour < 12 || hour === 24 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:00 ${period}`;
}

const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const gridHeight = (END_HOUR - START_HOUR) * ROW_HEIGHT;

export function MasterScheduleGrid({ consultants }: { consultants: ScheduleConsultant[] }) {
  return (
    <Card>
      <CardContent>
        <div className="flex overflow-x-auto">
          <div className="w-16 shrink-0">
            <div className="h-14" />
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute -translate-y-1/2 text-[11px] font-medium text-muted-foreground"
                  style={{ top: (hour - START_HOUR) * ROW_HEIGHT }}
                >
                  {hourLabel(hour)}
                </span>
              ))}
            </div>
          </div>

          {consultants.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              No consultants to schedule.
            </div>
          )}

          {consultants.map((consultant) => (
            <div key={consultant.id} className="min-w-40 flex-1 border-l border-border">
              <div className="flex h-14 flex-col items-center justify-center gap-1 border-b border-border px-2 text-center">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    consultant.avatarClass
                  )}
                >
                  {consultant.initials}
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-foreground">{consultant.name}</p>
                  <p className="text-[10px] text-muted-foreground">{consultant.role}</p>
                </div>
              </div>

              <div
                className="relative"
                style={{
                  height: gridHeight,
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent " +
                    ROW_HEIGHT +
                    "px)",
                }}
              >
                {consultant.events.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-md border px-2 py-1.5 text-xs",
                      variantClass[event.variant]
                    )}
                    style={{
                      top: (event.start - START_HOUR) * ROW_HEIGHT,
                      height: Math.max((event.end - event.start) * ROW_HEIGHT, 28),
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold">{event.title}</p>
                      {event.variant === "conflict" && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-[10px] opacity-80">
                      <Clock3 className="h-3 w-3" />
                      {event.time}
                    </p>
                    {event.tag && (
                      <p className="text-[10px] font-bold uppercase tracking-wide">{event.tag}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
