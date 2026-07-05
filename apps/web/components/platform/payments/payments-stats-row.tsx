import { Activity, RotateCcw, Receipt, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  note: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Transaction Volume",
    value: "8,420",
    trend: "+5.2%",
    trendUp: true,
    note: "vs last month",
    icon: Activity,
  },
  {
    label: "Refund Rate",
    value: "1.2%",
    trend: "-0.1%",
    trendUp: false,
    note: "stable",
    icon: RotateCcw,
  },
  {
    label: "Avg. Ticket Size",
    value: "$148.50",
    trend: "+2.4%",
    trendUp: true,
    note: "",
    icon: Receipt,
  },
  {
    label: "Net Revenue",
    value: "$428,500",
    trend: "+12.8%",
    trendUp: true,
    note: "",
    icon: Wallet,
  },
];

export function PaymentsStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, trend, trendUp, note, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {value}
              </p>
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trendUp
                    ? "text-emerald-600 dark:text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend}
                {note && <span className="text-muted-foreground">{note}</span>}
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
