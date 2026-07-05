import { ShieldAlert, CalendarClock, Users, FileWarning } from "lucide-react";
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
    label: "Escalated Accesses (30d)",
    value: "7",
    note: "Reason logged for each",
    noteClass: "text-muted-foreground",
    icon: ShieldAlert,
  },
  {
    label: "Last Escalation",
    value: "2 days ago",
    note: "Case #CASE-1042 · Dr. Meera Iyer",
    noteClass: "text-muted-foreground",
    icon: CalendarClock,
  },
  {
    label: "Consultants Involved",
    value: "4",
    note: "Across your tenant",
    noteClass: "text-muted-foreground",
    icon: Users,
  },
  {
    label: "Dispute-Related",
    value: "3",
    note: "Tied to an open dispute",
    noteClass: "text-amber-600 dark:text-amber-500",
    icon: FileWarning,
  },
];

export function AuditLogStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, noteClass, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
              <p className={cn("mt-1 text-xs font-medium", noteClass)}>{note}</p>
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
