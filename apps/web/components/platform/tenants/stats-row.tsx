import { AlertCircle, Building2, Hourglass } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    label: "Total Tenants",
    value: "1,248",
    icon: Building2,
    iconClass: "bg-muted text-foreground",
  },
  {
    label: "Active Trials",
    value: "84",
    icon: Hourglass,
    iconClass: "bg-primary/10 text-primary",
  },
  {
    label: "Open Grievances",
    value: "12",
    icon: AlertCircle,
    iconClass: "bg-destructive/10 text-destructive",
  },
];

export function TenantsStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
