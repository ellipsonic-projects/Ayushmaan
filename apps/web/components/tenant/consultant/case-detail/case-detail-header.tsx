import Link from "next/link";
import { ChevronLeft, CalendarClock, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseDetail, CaseStatus } from "@/components/tenant/consultant/case-detail/case-detail-data";

const statusBadgeClass: Record<CaseStatus, string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Closed: "border-border text-muted-foreground",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CaseDetailHeader({ caseDetail }: { caseDetail: CaseDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href="/slug/tenant/consultant/clients">
          <ChevronLeft className="h-4 w-4" />
          Back to cases
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${caseDetail.client.avatarClass}`}
          >
            {initials(caseDetail.client.name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{caseDetail.caseCode}</h1>
              <Badge variant="outline" className={statusBadgeClass[caseDetail.status]}>
                {caseDetail.status}
              </Badge>
            </div>
            <Link
              href="../../clients/id"
              className="flex items-center gap-0.5 text-sm text-primary hover:underline"
            >
              {caseDetail.client.name}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-sm text-muted-foreground">{caseDetail.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
            <CalendarClock className="h-3.5 w-3.5" />
            Created {caseDetail.createdAt}
          </div>
          {caseDetail.status === "Closed" && caseDetail.closedAt ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Closed {caseDetail.closedAt}
            </div>
          ) : (
            caseDetail.nextAppointment && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Next: {caseDetail.nextAppointment}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
