"use client";

import { useMemo } from "react";
import { Inbox, Timer, Zap, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlatformGrievance } from "@/lib/hooks";

const categoryLabel: Record<string, string> = {
  SERVICE_QUALITY: "Service Quality",
  MISCONDUCT: "Misconduct",
  BILLING_DISPUTE: "Billing Dispute",
  DATA_PRIVACY: "Data Privacy",
  OTHER: "Other",
};

function averageResolutionDays(resolved: PlatformGrievance[]) {
  if (resolved.length === 0) return null;
  const totalMs = resolved.reduce((sum, g) => {
    if (!g.resolvedAt) return sum;
    return sum + (new Date(g.resolvedAt).getTime() - new Date(g.createdAt).getTime());
  }, 0);
  return totalMs / resolved.length / (1000 * 60 * 60 * 24);
}

export function GrievancesStatsRow({ grievances }: { grievances: PlatformGrievance[] }) {
  const stats: {
    label: string;
    value: string;
    note: string;
    badge?: string;
    badgeClass?: string;
    icon: LucideIcon;
  }[] = useMemo(() => {
    const open = grievances.filter((g) => g.status === "OPEN");
    const critical = open.filter((g) => g.severity === "CRITICAL");
    const resolved = grievances.filter((g) => g.status === "RESOLVED" && g.resolvedAt);
    const avgDays = averageResolutionDays(resolved);

    const triaged = grievances.filter((g) => g.status !== "OPEN").length;
    const triageVelocity =
      grievances.length > 0 ? Math.round((triaged / grievances.length) * 100) : 0;

    const categoryCounts = new Map<string, number>();
    for (const g of grievances) {
      categoryCounts.set(g.category, (categoryCounts.get(g.category) ?? 0) + 1);
    }
    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    return [
      {
        label: "Open Grievances",
        value: String(open.length),
        note: `of ${grievances.length} shown`,
        badge: critical.length > 0 ? `${critical.length} Critical` : undefined,
        badgeClass:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
        icon: Inbox,
      },
      {
        label: "Avg. Resolution Time",
        value: avgDays === null ? "—" : `${avgDays.toFixed(1)} days`,
        note: `${resolved.length} resolved`,
        icon: Timer,
      },
      {
        label: "Triage Velocity",
        value: `${triageVelocity}%`,
        note: "moved past Open",
        icon: Zap,
      },
      {
        label: "Top Category",
        value: topCategory ? (categoryLabel[topCategory[0]] ?? topCategory[0]) : "—",
        note: topCategory
          ? `${Math.round((topCategory[1] / grievances.length) * 100)}% of shown volume`
          : "",
        icon: TrendingUp,
      },
    ];
  }, [grievances]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, badge, badgeClass, icon: Icon }) => (
        <Card key={label}>
          <CardContent>
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-4 w-4" />
              </span>
              {badge && (
                <Badge variant="outline" className={cn("text-[10px]", badgeClass)}>
                  {badge.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
            {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
