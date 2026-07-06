import { Users, CheckCircle2, Star, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  {
    label: "Total Consultants",
    value: "12",
    icon: Users,
    iconClass: "bg-muted text-foreground",
  },
  {
    label: "Accepting New Clients",
    value: "9",
    icon: CheckCircle2,
    iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    label: "Avg Rating",
    value: "4.7",
    icon: Star,
    iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    label: "Categories Covered",
    value: "4",
    icon: Layers,
    iconClass: "bg-primary/10 text-primary",
  },
];

export function ConsultantsStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
