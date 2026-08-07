"use client";

import Link from "next/link";
import { ChevronLeft, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseSummary } from "@/components/tenant/admin/session-detail/session-detail-data";
import { useTenantSlug } from "@/lib/tenant/slug-context";

const statusBadgeClass: Record<CaseSummary["status"], string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Closed: "border-border text-muted-foreground",
};

export function SessionDetailHeader({ caseSummary }: { caseSummary: CaseSummary }) {
  const initials = caseSummary.clientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const slug = useTenantSlug();

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href={`/${slug}/tenant/admin/calendar`}>
          <ChevronLeft className="h-4 w-4" />
          Back to calendar
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
            {initials}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{caseSummary.clientName}</h1>
              <Badge variant="outline" className="text-muted-foreground">
                {caseSummary.clientStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              #{caseSummary.clientCode} &middot; {caseSummary.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={statusBadgeClass[caseSummary.status]} variant="outline">
            {caseSummary.status}
          </Badge>
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Next: {caseSummary.nextAppointment}
          </div>
        </div>
      </div>
    </div>
  );
}
