import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentDbStatus, CaseSession } from "@/lib/api/case-detail.server";

const statusIcon: Record<AppointmentDbStatus, typeof Clock3> = {
  REQUESTED: Clock3,
  APPROVED: Clock3,
  RESCHEDULE_PROPOSED: Clock3,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  NO_SHOW: XCircle,
};

const statusLabel: Record<AppointmentDbStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Scheduled",
  RESCHEDULE_PROPOSED: "Reschedule Proposed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const statusBadgeClass: Record<AppointmentDbStatus, string> = {
  REQUESTED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  APPROVED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  RESCHEDULE_PROPOSED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "border-border text-muted-foreground",
  NO_SHOW: "border-border text-muted-foreground",
};

export function CaseSessionsTimeline({ sessions }: { sessions: CaseSession[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Sessions Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
        ) : (
          <ol className="flex flex-col gap-5">
            {sessions.map((session, index) => {
              const Icon = statusIcon[session.status];
              return (
                <li key={session.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted",
                        statusBadgeClass[session.status]
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {index < sessions.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`../../sessions/${session.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {format(new Date(session.scheduledStart), "EEE, d MMM")}
                      </Link>
                      <Badge variant="outline" className={statusBadgeClass[session.status]}>
                        {statusLabel[session.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {format(new Date(session.scheduledStart), "h:mm a")} &ndash;{" "}
                      {format(new Date(session.scheduledEnd), "h:mm a")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
