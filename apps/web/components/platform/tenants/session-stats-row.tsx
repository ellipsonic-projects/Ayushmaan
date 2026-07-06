import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Total Sessions",
    value: "1,248",
    note: "+12% prior period",
    icon: TrendingUp,
  },
  {
    label: "Average Duration",
    value: "42m 15s",
    note: "±2m 04s",
    icon: Clock,
  },
  {
    label: "Completion Rate",
    value: "99.8%",
    note: "Stable",
    icon: CheckCircle2,
  },
  {
    label: "Volume Trend",
    value: "",
    note: "Consistent growth trend",
    icon: BarChart3,
  },
];

export function SessionStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, icon: Icon }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              {value ? (
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                  {value}
                </p>
              ) : (
                <div className="mt-2 flex items-end gap-0.5">
                  {[4, 7, 5, 9, 6, 10].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-sm bg-primary/70"
                      style={{ height: `${h * 2}px` }}
                    />
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
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
