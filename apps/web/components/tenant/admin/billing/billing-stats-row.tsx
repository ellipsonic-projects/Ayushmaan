import { Wallet, CalendarCheck, Clock3, RotateCcw } from "lucide-react";
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
    label: "Total Revenue (30d)",
    value: "$18,240",
    note: "+8.4% vs last month",
    noteClass: "text-emerald-600 dark:text-emerald-500",
    icon: Wallet,
  },
  {
    label: "Bookings Completed",
    value: "142",
    note: "Across 9 consultants",
    noteClass: "text-muted-foreground",
    icon: CalendarCheck,
  },
  {
    label: "Pending Payments",
    value: "$1,240",
    note: "6 bookings awaiting payment",
    noteClass: "text-amber-600 dark:text-amber-500",
    icon: Clock3,
  },
  {
    label: "Refunds Issued",
    value: "$320",
    note: "2 refunds this month",
    noteClass: "text-muted-foreground",
    icon: RotateCcw,
  },
];

export function BillingStatsRow() {
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
