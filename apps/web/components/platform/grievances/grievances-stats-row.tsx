import { Inbox, Timer, Zap, TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  trendGood: boolean;
  note: string;
  badge?: string;
  badgeClass?: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Open Grievances",
    value: "24",
    trend: "~12%",
    trendUp: true,
    trendGood: false,
    note: "vs last 30d",
    badge: "5 Critical",
    badgeClass:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
    icon: Inbox,
  },
  {
    label: "Avg. Resolution Time",
    value: "4.2 days",
    trend: "~0.5d",
    trendUp: false,
    trendGood: true,
    note: "improving",
    badge: "Last 30d",
    icon: Timer,
  },
  {
    label: "Triage Velocity",
    value: "92%",
    trend: "< 24h goal",
    trendUp: true,
    trendGood: true,
    note: "",
    icon: Zap,
  },
  {
    label: "Top Category",
    value: "Service Quality",
    trend: "38% of total volume",
    trendUp: true,
    trendGood: false,
    note: "",
    badge: "Trend High",
    badgeClass:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
    icon: TrendingUp,
  },
];

export function GrievancesStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(
        ({ label, value, trend, trendUp, trendGood, note, badge, badgeClass, icon: Icon }) => (
          <Card key={label}>
            <CardContent>
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {badge && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", badgeClass)}
                  >
                    {badge.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {value}
              </p>
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trendGood
                    ? "text-emerald-600 dark:text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend}
                {note && <span className="text-muted-foreground">{note}</span>}
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
