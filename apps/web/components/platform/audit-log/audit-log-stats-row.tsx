"use client";

import { useMemo } from "react";
import { ScrollText, ShieldAlert, Building2, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useAuditLog } from "@/lib/hooks";

export function AuditLogStatsRow() {
  const { entries, isLoading } = useAuditLog();

  const stats: { label: string; value: string; icon: LucideIcon; iconClass: string }[] =
    useMemo(() => {
      const crossTenant = entries.filter((e) => e.isCrossTenantAccess).length;
      const tenantCount = new Set(entries.map((e) => e.tenantId)).size;
      const actorCount = new Set(entries.map((e) => e.actorUserId)).size;

      return [
        {
          label: "Events shown",
          value: isLoading ? "…" : String(entries.length),
          icon: ScrollText,
          iconClass: "text-primary",
        },
        {
          label: "Cross-tenant accesses",
          value: isLoading ? "…" : String(crossTenant),
          icon: ShieldAlert,
          iconClass: "text-amber-600 dark:text-amber-500",
        },
        {
          label: "Tenants involved",
          value: isLoading ? "…" : String(tenantCount),
          icon: Building2,
          iconClass: "text-muted-foreground",
        },
        {
          label: "Distinct actors",
          value: isLoading ? "…" : String(actorCount),
          icon: UserCog,
          iconClass: "text-emerald-600 dark:text-emerald-500",
        },
      ];
    }, [entries, isLoading]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass }) => (
        <Card key={label}>
          <CardContent>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </span>
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
