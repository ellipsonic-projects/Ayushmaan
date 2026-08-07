import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Clock3, AlertTriangle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTenantConsultant } from "@/lib/api/consultants.server";
import { getTenantAppointments } from "@/lib/api/appointments.server";
import { toScheduleEvents } from "@/components/tenant/admin/appointments/schedule-transforms";

export default async function ConsultantSchedulePage({
  params,
}: {
  params: Promise<{ slug: string; consultantId: string }>;
}) {
  const { slug, consultantId } = await params;

  const consultant = await getTenantConsultant(consultantId);
  if (!consultant) notFound();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await getTenantAppointments({
    from: todayStart.toISOString(),
    to: todayEnd.toISOString(),
  });
  const consultantAppointments = appointments.filter((a) => a.case.consultant?.id === consultantId);
  const events = toScheduleEvents(consultantAppointments, false);

  const variantClass: Record<(typeof events)[number]["variant"], string> = {
    default:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
    conflict:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    overtime:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href={`/${slug}/tenant/admin/scheduler`} className="hover:text-foreground">
            Master Schedule
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{consultant.fullName}</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">{consultant.fullName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(now, "MMM d, yyyy")}&apos;s booked slots and conflicts for this consultant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Today&apos;s Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No appointments scheduled for today.
            </p>
          )}
          {events.map((event) => (
            <div
              key={event.id}
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
