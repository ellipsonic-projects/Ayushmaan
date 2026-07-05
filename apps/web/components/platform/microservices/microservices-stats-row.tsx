import { TrendingUp, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats: {
  label: string;
  value: string;
  trend?: string;
  trendClass?: string;
  dot?: string;
  check?: boolean;
  footnote: string;
  footnoteClass: string;
}[] = [
  {
    label: "Active Tenants",
    value: "1,248",
    trend: "+12%",
    trendClass: "text-emerald-600 dark:text-emerald-500",
    footnote: "",
    footnoteClass: "",
  },
  {
    label: "Total MRR",
    value: "$142,500",
    trend: "+34.2%",
    trendClass: "text-emerald-600 dark:text-emerald-500",
    footnote: "Projection: $175k by EOM",
    footnoteClass: "text-muted-foreground",
  },
  {
    label: "System Uptime",
    value: "99.98%",
    dot: "bg-emerald-500",
    footnote: "Last downtime: 14 days ago",
    footnoteClass: "text-muted-foreground",
  },
  {
    label: "Critical Grievances",
    value: "0",
    check: true,
    footnote: "Healthy Status",
    footnoteClass: "text-emerald-600 dark:text-emerald-500",
  },
];

export function MicroservicesStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(
        ({ label, value, trend, trendClass, dot, check, footnote, footnoteClass }) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                {trend && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      trendClass
                    )}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {trend}
                  </span>
                )}
                {dot && <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />}
                {check && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {footnote && (
                <p className={cn("text-xs", footnoteClass)}>{footnote}</p>
              )}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
