import { ShieldAlert, CalendarClock, Users, FileWarning } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  {
    label: "Escalated accesses (30d)",
    value: "7",
    icon: ShieldAlert,
    iconClass: "text-amber-600 dark:text-amber-500",
  },
  {
    label: "Last escalation",
    value: "2 days ago",
    icon: CalendarClock,
    iconClass: "text-muted-foreground",
  },
  {
    label: "Consultants involved",
    value: "4",
    icon: Users,
    iconClass: "text-muted-foreground",
  },
  {
    label: "Dispute-related",
    value: "3",
    icon: FileWarning,
    iconClass: "text-blue-600 dark:text-blue-500",
  },
];

export function AuditLogStatsRow() {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {stats.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {value}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
