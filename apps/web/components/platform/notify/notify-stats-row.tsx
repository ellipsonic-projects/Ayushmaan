import { AlertTriangle, HeartPulse, MailCheck, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  note: string;
  noteClass: string;
  badge: string;
  badgeClass: string;
  iconClass: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Active Urgent Alerts",
    value: "04",
    note: "Alerts Live",
    noteClass: "text-red-600 dark:text-red-500",
    badge: "",
    badgeClass: "",
    iconClass: "bg-red-500/10 text-red-600 dark:text-red-500",
    icon: AlertTriangle,
  },
  {
    label: "System Health (Global)",
    value: "99.98%",
    note: "",
    noteClass: "",
    badge: "Stable",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    icon: HeartPulse,
  },
  {
    label: "Delivery Rate (%)",
    value: "98.5%",
    note: "+0.2%",
    noteClass: "text-emerald-600 dark:text-emerald-500",
    badge: "",
    badgeClass: "",
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
    icon: MailCheck,
  },
  {
    label: "Active Maint. Windows",
    value: "02 Pending",
    note: "",
    noteClass: "",
    badge: "Scheduled",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    icon: CalendarClock,
  },
];

export function NotifyStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(
        ({ label, value, note, noteClass, badge, badgeClass, iconClass, icon: Icon }) => (
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
                {badge && (
                  <Badge variant="outline" className={cn("text-[10px]", badgeClass)}>
                    {badge.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5 text-xl font-bold text-foreground">
                {value}
                {note && (
                  <span className={cn("text-xs font-medium", noteClass)}>
                    {note}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
