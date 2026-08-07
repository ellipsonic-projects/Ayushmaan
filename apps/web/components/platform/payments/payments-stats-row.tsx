import { Activity, RotateCcw, Receipt, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats: { label: string; icon: LucideIcon }[] = [
  { label: "Transaction Volume", icon: Activity },
  { label: "Refund Rate", icon: RotateCcw },
  { label: "Avg. Ticket Size", icon: Receipt },
  { label: "Net Revenue", icon: Wallet },
];

export function PaymentsStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-muted-foreground">Not available</p>
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
