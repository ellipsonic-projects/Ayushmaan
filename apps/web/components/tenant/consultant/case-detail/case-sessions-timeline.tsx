import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CaseSession,
  SessionStatus,
} from "@/components/tenant/consultant/case-detail/case-detail-data";

const statusIcon: Record<SessionStatus, typeof Clock3> = {
  Scheduled: Clock3,
  Completed: CheckCircle2,
  Cancelled: XCircle,
};

const statusBadgeClass: Record<SessionStatus, string> = {
  Scheduled:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Cancelled: "border-border text-muted-foreground",
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
                      href={`../../sessions/id`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {session.title}
                    </Link>
                    <Badge variant="outline" className={statusBadgeClass[session.status]}>
                      {session.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.scheduledStart} &ndash; {session.scheduledEnd}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consultant: {session.consultantName}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
