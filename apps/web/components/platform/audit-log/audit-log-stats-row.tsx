import { ScrollText, ShieldAlert, Building2, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  {
    label: "Events (30d)",
    value: "482",
    icon: ScrollText,
    iconClass: "text-primary",
  },
  {
    label: "Escalated accesses",
    value: "11",
    icon: ShieldAlert,
    iconClass: "text-amber-600 dark:text-amber-500",
  },
  {
    label: "Tenants involved",
    value: "9",
    icon: Building2,
    iconClass: "text-muted-foreground",
  },
  {
    label: "API keys issued",
    value: "3",
    icon: KeyRound,
    iconClass: "text-emerald-600 dark:text-emerald-500",
  },
];

export function AuditLogStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass }) => (
        <Card key={label}>
          <CardContent>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </span>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
