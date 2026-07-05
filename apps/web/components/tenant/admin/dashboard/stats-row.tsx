import { CalendarCheck, Stethoscope, Wallet, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats: {
  label: string;
  value: string;
  icon: LucideIcon;
  badge: { text: string; variant: "outline" | "destructive" | "secondary"; dot?: boolean };
  footnote: string;
}[] = [
  {
    label: "Today's Appointments",
    value: "18",
    icon: CalendarCheck,
    badge: { text: "3 Upcoming", variant: "outline" },
    footnote: "Next at 2:30 PM",
  },
  {
    label: "Active Consultants",
    value: "9",
    icon: Stethoscope,
    badge: { text: "Online", variant: "secondary", dot: true },
    footnote: "2 on leave today",
  },
  {
    label: "Monthly Revenue",
    value: "$18,240",
    icon: Wallet,
    badge: { text: "+8.4%", variant: "outline" },
    footnote: "vs last month",
  },
  {
    label: "Pending Approvals",
    value: "5",
    icon: ClipboardList,
    badge: { text: "2 Urgent", variant: "destructive" },
    footnote: "Onboarding & leave requests",
  },
];

export function TenantStatsRow() {
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
