import { AlertTriangle, CalendarClock, CalendarCheck, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    label: "Active Tenants",
    value: "124",
    icon: Users,
    badge: { text: "+12%", variant: "outline" as const },
    footnote: "Provisioned Infrastructure",
  },
  {
    label: "Open Grievances",
    value: "8",
    icon: AlertTriangle,
    badge: { text: "3 CRITICAL", variant: "destructive" as const },
    footnote: "Avg. response: 24m",
  },
  {
    label: "Logged in Tenants",
    value: "84",
    icon: CalendarCheck,
    badge: { text: "Online", variant: "secondary" as const, dot: true },
    footnote: "Active sessions",
  },
  {
    label: "New Tenant Meet",
    value: "1,432",
    icon: CalendarClock,
    badge: { text: "+18%", variant: "outline" as const },
    footnote: "Scheduled",
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, badge, footnote }) => (
        <Card key={label}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <Badge variant={badge.variant} className="gap-1">
                {badge.dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {badge.text}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{footnote}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
