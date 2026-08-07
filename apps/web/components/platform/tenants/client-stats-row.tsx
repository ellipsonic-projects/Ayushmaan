import { BarChart3, Clock, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TenantClient } from "@/lib/api/clients.server";

export function ClientStatsRow({ clients }: { clients: TenantClient[] }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeCases = clients.reduce(
    (sum, c) => sum + c.cases.filter((cs) => cs.status === "ACTIVE").length,
    0
  );
  const upcomingAppointments = clients.reduce(
    (sum, c) =>
      sum +
      c.cases.reduce(
        (caseSum, cs) =>
          caseSum + cs.appointments.filter((a) => new Date(a.scheduledStart) >= now).length,
        0
      ),
    0
  );
  const newThisMonth = clients.filter((c) => new Date(c.createdAt) >= startOfMonth).length;

  const stats: {
    label: string;
    value: string;
    note: string;
    noteClass: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Total Clients",
      value: String(clients.length),
      note: `${newThisMonth} new this month`,
      noteClass: "text-emerald-600 dark:text-emerald-500",
      icon: Users,
    },
    {
      label: "Active Cases",
      value: String(activeCases),
      note: "In progress",
      noteClass: "text-primary",
      icon: BarChart3,
    },
    {
      label: "Upcoming Appointments",
      value: String(upcomingAppointments),
      note: "Scheduled",
      noteClass: "text-primary",
      icon: Clock,
    },
    {
      label: "New This Month",
      value: String(newThisMonth),
      note: "Since 1st",
      noteClass: "text-emerald-600 dark:text-emerald-500",
      icon: UserPlus,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, noteClass, icon: Icon }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
              <p className={cn("mt-1 text-xs font-medium", noteClass)}>{note}</p>
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
