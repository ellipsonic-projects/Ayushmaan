import { Wallet, CalendarCheck, Clock3, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const lineItems: {
  label: string;
  value: string;
  note: string;
  noteClass: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Total Revenue",
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
    <Card>
      <CardContent className="flex flex-col divide-y divide-dashed divide-border p-0">
        {lineItems.map(({ label, value, note, noteClass, icon: Icon }, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center justify-between gap-4 px-5 py-4",
              i === 0 && "pt-5",
              i === lineItems.length - 1 && "pb-5"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className={cn("text-[11px] font-medium", noteClass)}>{note}</p>
              </div>
            </div>
            <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-foreground">
              {value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
