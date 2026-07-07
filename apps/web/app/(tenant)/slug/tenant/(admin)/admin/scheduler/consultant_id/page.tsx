import Link from "next/link";
import { ChevronRight, Clock3, AlertTriangle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// appointments — schema §3.12, filtered to this consultant for the day
type Variant = "default" | "conflict" | "overtime";

type ScheduleEvent = {
  title: string;
  time: string;
  variant: Variant;
  tag?: string;
};

const events: ScheduleEvent[] = [
  { title: "Patient Consultation", time: "08:00 - 09:00 AM", variant: "default" },
  {
    title: "Case Review",
    time: "09:00 - 10:30 AM",
    variant: "conflict",
    tag: "BOOKING CONFLICT",
  },
  { title: "Corporate Audit", time: "10:00 AM - 12:00 PM", variant: "default" },
  {
    title: "Compliance Training",
    time: "03:00 - 03:15 PM",
    variant: "overtime",
    tag: "EXISTING SLOT",
  },
];

const variantClass: Record<Variant, string> = {
  default:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  conflict:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  overtime:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

export default function ConsultantSchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/slug/scheduler" className="hover:text-foreground">
            Master Schedule
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Dr. Jane Doe</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Dr. Jane Doe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Today's booked slots and conflicts for this consultant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Today's Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.map((event) => (
            <div
              key={event.title}
              className={cn(
                "flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
                variantClass[event.variant]
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{event.title}</p>
                  {event.variant === "conflict" && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                  <Clock3 className="h-3 w-3" />
                  {event.time}
                </p>
              </div>
              {event.tag && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
                  {event.tag}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
