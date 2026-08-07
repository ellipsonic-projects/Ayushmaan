"use client";

import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePlatformDashboardStats } from "@/lib/hooks";

export function MicroservicesStatsRow() {
  const { stats, isLoading } = usePlatformDashboardStats();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active Tenants
          </p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "…" : (stats?.activeTenants ?? 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total MRR
          </p>
          <p className="text-2xl font-bold text-muted-foreground">Not available</p>
          <p className="text-xs text-muted-foreground">No billing data connected yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            System Uptime
          </p>
          <p className="text-2xl font-bold text-muted-foreground">Not available</p>
          <p className="text-xs text-muted-foreground">No infra monitoring connected yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Critical Grievances
            </p>
            {!isLoading && (stats?.criticalGrievances ?? 0) === 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "…" : (stats?.criticalGrievances ?? 0)}
          </p>
          <p
            className={cn(
              "text-xs",
              !isLoading && (stats?.criticalGrievances ?? 0) === 0
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-muted-foreground"
            )}
          >
            {!isLoading && (stats?.criticalGrievances ?? 0) === 0 ? "Healthy Status" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
