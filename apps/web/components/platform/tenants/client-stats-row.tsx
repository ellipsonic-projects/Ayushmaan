import { AlertTriangle, BarChart3, Clock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  note: string;
  noteClass: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Total Clients",
    value: "1,284",
    note: "+4.2%",
    noteClass: "text-emerald-600 dark:text-emerald-500",
    icon: Users,
  },
  {
    label: "Active Sessions",
    value: "42",
    note: "Live now",
    noteClass: "text-primary",
    icon: Clock,
  },
  {
    label: "Retention Rate",
    value: "94.8%",
    note: "High Trust",
    noteClass: "text-emerald-600 dark:text-emerald-500",
    icon: BarChart3,
  },
  {
    label: "Pending Grievances",
    value: "02",
    note: "Immediate Action",
    noteClass: "text-destructive",
    icon: AlertTriangle,
  },
];

export function ClientStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, noteClass, icon: Icon }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {value}
              </p>
              <p className={cn("mt-1 text-xs font-medium", noteClass)}>
                {note}
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
              <Icon className="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
