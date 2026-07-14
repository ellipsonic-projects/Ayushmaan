import { Building2, Hourglass } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Tenant } from "@/lib/hooks";

// Grievance counts aren't wired here — grievances.router.ts (data_api_v4.md
// §? / sprints_v3.md Sprint 9.2) doesn't exist yet, so there's no real
// number to show; the card that used to fake one has been dropped.
export function TenantsStatsRow({ tenants }: { tenants: Tenant[] }) {
  const stats = [
    {
      label: "Total Tenants",
      value: String(tenants.length),
      icon: Building2,
      iconClass: "bg-muted text-foreground",
    },
    {
      label: "Active Tenants",
      value: String(tenants.filter((t) => t.status === "ACTIVE").length),
      icon: Hourglass,
      iconClass: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map(({ label, value, icon: Icon, iconClass }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
