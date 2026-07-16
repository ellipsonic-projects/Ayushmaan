"use client";

import { AlertTriangle, CalendarClock, Users, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatformDashboardStats } from "@/lib/hooks";

export function StatsGrid() {
  const { stats, isLoading, error } = usePlatformDashboardStats();

  if (error) {
    return <p className="text-sm text-destructive">Failed to load dashboard stats.</p>;
  }

  const cards = [
    {
      label: "Active Tenants",
      value: stats?.activeTenants,
      icon: Users,
      footnote: "Provisioned Infrastructure",
    },
    {
      label: "Open Grievances",
      value: stats?.openGrievances,
      icon: AlertTriangle,
      badge:
        stats && stats.criticalGrievances > 0
          ? { text: `${stats.criticalGrievances} CRITICAL`, variant: "destructive" as const }
          : undefined,
      footnote: "Awaiting review",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers,
      icon: UsersRound,
      footnote: "Across all tenants",
    },
    {
      label: "New Tenants",
      value: stats?.newTenants,
      icon: CalendarClock,
      footnote: "Last 30 days",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, badge, footnote }) => (
        <Card key={label}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-4 w-4" />
              </span>
              {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? "—" : (value ?? 0).toLocaleString()}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{footnote}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
