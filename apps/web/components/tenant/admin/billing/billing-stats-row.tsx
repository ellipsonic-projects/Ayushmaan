import { Wallet, CalendarCheck, Clock3, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const lineItems: { label: string; icon: LucideIcon }[] = [
  { label: "Total Revenue", icon: Wallet },
  { label: "Bookings Completed", icon: CalendarCheck },
  { label: "Pending Payments", icon: Clock3 },
  { label: "Refunds Issued", icon: RotateCcw },
];

export function BillingStatsRow() {
  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-dashed divide-border p-0">
        {lineItems.map(({ label, icon: Icon }, i) => (
          <div
            key={label}
            className={
              "flex items-center justify-between gap-4 px-5 py-4" +
              (i === 0 ? " pt-5" : "") +
              (i === lineItems.length - 1 ? " pb-5" : "")
            }
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-muted-foreground">Not available</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
