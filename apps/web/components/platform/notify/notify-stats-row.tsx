"use client";

import { AlertTriangle, Send, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBroadcastStats } from "@/lib/hooks";

export function NotifyStatsRow() {
  const { stats, isLoading } = useBroadcastStats();

  const cards: { label: string; value: string; iconClass: string; icon: LucideIcon }[] = [
    {
      label: "Active Urgent Alerts (24h)",
      value: isLoading ? "…" : String(stats?.activeUrgentAlerts ?? 0),
      iconClass: "bg-red-500/10 text-red-600 dark:text-red-500",
      icon: AlertTriangle,
    },
    {
      label: "Broadcasts Sent (30d)",
      value: isLoading ? "…" : String(stats?.sentLast30Days ?? 0),
      iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
      icon: Send,
    },
    {
      label: "Recipients Reached (30d)",
      value: isLoading ? "…" : (stats?.recipientsReachedLast30Days ?? 0).toLocaleString(),
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ label, value, iconClass, icon: Icon }) => (
        <Card key={label}>
          <CardContent>
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  iconClass
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
