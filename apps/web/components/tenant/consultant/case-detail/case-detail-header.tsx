import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, CalendarClock, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseDetailData } from "@/lib/api/case-detail.server";
import type { CaseStatus } from "@/lib/api/cases.server";

const statusLabel: Record<CaseStatus, string> = {
  ACTIVE: "Open",
  ON_HOLD: "On Hold",
  CLOSED: "Closed",
};

const statusBadgeClass: Record<CaseStatus, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  ON_HOLD:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  CLOSED: "border-border text-muted-foreground",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function caseCode(caseDetail: CaseDetailData) {
  return caseDetail.matterKey ?? `#${caseDetail.id.slice(0, 8)}`;
}

export function CaseDetailHeader({ caseDetail }: { caseDetail: CaseDetailData }) {
  const nextSession = caseDetail.appointments.find(
    (a) => a.status === "REQUESTED" || a.status === "APPROVED"
  );

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href="../../cases">
          <ChevronLeft className="h-4 w-4" />
          Back to cases
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
            {initials(caseDetail.client.fullName)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{caseCode(caseDetail)}</h1>
              <Badge variant="outline" className={statusBadgeClass[caseDetail.status]}>
                {statusLabel[caseDetail.status]}
              </Badge>
            </div>
            <Link
              href="../../clients"
              className="flex items-center gap-0.5 text-sm text-primary hover:underline"
            >
              {caseDetail.client.fullName}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-sm text-muted-foreground">{caseDetail.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
            <CalendarClock className="h-3.5 w-3.5" />
            Created {format(new Date(caseDetail.createdAt), "MMM d, yyyy")}
          </div>
          {caseDetail.status === "CLOSED" ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Closed {format(new Date(caseDetail.updatedAt), "MMM d, yyyy")}
            </div>
          ) : (
            nextSession && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Next: {format(new Date(nextSession.scheduledStart), "EEE, d MMM · h:mm a")}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
