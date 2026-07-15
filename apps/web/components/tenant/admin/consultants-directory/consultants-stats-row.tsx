import { Users, CheckCircle2, Star, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

export function ConsultantsStatsRow({ consultants }: { consultants: ConsultantProfile[] }) {
  const accepting = consultants.filter((c) => c.isAcceptingNewClients).length;
  const rated = consultants.filter((c) => c.ratingCount > 0);
  const avgRating =
    rated.length > 0 ? rated.reduce((sum, c) => sum + Number(c.ratingAvg), 0) / rated.length : 0;
  const categories = new Set(consultants.map((c) => c.category)).size;

  const stats: {
    label: string;
    value: string;
    icon: LucideIcon;
    iconClass: string;
  }[] = [
    {
      label: "Total Consultants",
      value: String(consultants.length),
      icon: Users,
      iconClass: "bg-muted text-foreground",
    },
    {
      label: "Accepting New Clients",
      value: String(accepting),
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
      label: "Avg Rating",
      value: avgRating.toFixed(1),
      icon: Star,
      iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      label: "Categories Covered",
      value: String(categories),
      icon: Layers,
      iconClass: "bg-primary/10 text-primary",
    },
  ];

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
