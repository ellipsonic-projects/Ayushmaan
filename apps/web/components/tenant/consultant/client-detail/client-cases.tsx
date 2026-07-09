import Link from "next/link";
import { Briefcase, ChevronRight, MessageSquareText, ShieldAlert, ListTodo, FolderOpen } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CaseStatus, CaseSummary } from "@/components/tenant/consultant/cases/cases-data";

const statusBadgeClass: Record<CaseStatus, string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Closed: "border-border text-muted-foreground",
};

function StatChip({ icon: Icon, value, label }: { icon: typeof MessageSquareText; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={label}>
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

export function ClientCases({ cases }: { cases: CaseSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Cases ({cases.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases on file for this client.</p>
        ) : (
          cases.map((item) => (
            <Link
              key={item.id}
              href="/slug/tenant/consultant/cases/id"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{item.category}</p>
                  <Badge variant="outline" className={statusBadgeClass[item.status]}>
                    {item.status}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {item.caseCode} &middot; Started {item.startedAt}
                  {item.status === "Closed" && item.closedAt && (
                    <> &middot; Closed {item.closedAt}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-3 sm:flex">
                  <StatChip icon={MessageSquareText} value={item.interactionCount} label="Interactions" />
                  <StatChip icon={ShieldAlert} value={item.commitmentCount} label="Commitments" />
                  <StatChip icon={ListTodo} value={item.taskCount} label="Tasks" />
                  <StatChip icon={FolderOpen} value={item.documentCount} label="Documents" />
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
