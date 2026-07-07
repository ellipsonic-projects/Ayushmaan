import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  valueClass?: string;
  note: string;
  noteClass: string;
  showArrow?: boolean;
}[] = [
  {
    label: "Active Clients",
    value: "124",
    note: "+4%",
    noteClass: "text-emerald-600 dark:text-emerald-500",
  },
  {
    label: "High Priority / VIP",
    value: "18",
    valueClass: "text-destructive",
    note: "of 124",
    noteClass: "text-muted-foreground",
  },
  {
    label: "Avg Interaction Velocity",
    value: "2.4",
    note: "per/wk",
    noteClass: "text-muted-foreground",
  },
  {
    label: "Client Retention",
    value: "92%",
    valueClass: "text-emerald-600 dark:text-emerald-500",
    note: "",
    noteClass: "",
    showArrow: true,
  },
];

export function ClientStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, valueClass, note, noteClass, showArrow }) => (
        <Card key={label} size="sm">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className={cn("text-2xl font-bold tabular-nums text-foreground", valueClass)}>
                {value}
              </p>
              {note && (
                <span className={cn("text-xs font-medium", noteClass)}>{note}</span>
              )}
              {showArrow && (
                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
