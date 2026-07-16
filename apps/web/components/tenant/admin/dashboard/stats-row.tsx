import { CalendarCheck, Stethoscope, Wallet, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTenantConsultants } from "@/lib/api/consultants.server";
import { getTenantAppointments } from "@/lib/api/appointments.server";
import { getPlatformTenantConsultants } from "@/lib/api/platform-consultants.server";
import { getPlatformTenantAppointments } from "@/lib/api/platform-appointments.server";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function TenantStatsRow({
  platformTenant,
}: {
  platformTenant?: { tenantId: string; tenantSlug: string };
} = {}) {
  const now = new Date();

  const [consultants, todaysAppointments, monthlyAppointments, pendingAppointments] = platformTenant
    ? await Promise.all([
        getPlatformTenantConsultants(platformTenant.tenantId, platformTenant.tenantSlug),
        getPlatformTenantAppointments(platformTenant.tenantId, platformTenant.tenantSlug, {
          from: startOfDay(now).toISOString(),
          to: endOfDay(now).toISOString(),
        }),
        getPlatformTenantAppointments(platformTenant.tenantId, platformTenant.tenantSlug, {
          from: startOfMonth(now).toISOString(),
          to: now.toISOString(),
        }),
        getPlatformTenantAppointments(platformTenant.tenantId, platformTenant.tenantSlug, {
          status: "REQUESTED",
        }),
      ])
    : await Promise.all([
        getTenantConsultants(),
        getTenantAppointments({
          from: startOfDay(now).toISOString(),
          to: endOfDay(now).toISOString(),
        }),
        getTenantAppointments({ from: startOfMonth(now).toISOString(), to: now.toISOString() }),
        getTenantAppointments({ status: "REQUESTED" }),
      ]);

  const acceptingConsultants = consultants.filter((c) => c.isAcceptingNewClients).length;

  const pendingToday = todaysAppointments.filter((a) => a.status === "REQUESTED").length;
  const nextAppointment = todaysAppointments
    .filter((a) => new Date(a.scheduledStart) >= now)
    .sort((a, b) => +new Date(a.scheduledStart) - +new Date(b.scheduledStart))[0];

  const monthlyRevenue = monthlyAppointments
    .flatMap((a) => a.payments)
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const urgentApprovals = pendingAppointments.filter(
    (a) => +new Date(a.scheduledStart) - +now < 24 * 60 * 60 * 1000
  ).length;

  const stats: {
    label: string;
    value: string;
    icon: LucideIcon;
    badge: { text: string; variant: "outline" | "destructive" | "secondary"; dot?: boolean };
    footnote: string;
  }[] = [
    {
      label: "Today's Appointments",
      value: String(todaysAppointments.length),
      icon: CalendarCheck,
      badge: { text: `${pendingToday} Pending`, variant: "outline" },
      footnote: nextAppointment
        ? `Next at ${new Date(nextAppointment.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
        : "No more appointments today",
    },
    {
      label: "Active Consultants",
      value: String(consultants.length),
      icon: Stethoscope,
      badge: { text: `${acceptingConsultants} Accepting`, variant: "secondary" },
      footnote: `${consultants.length} registered`,
    },
    {
      label: "Monthly Revenue",
      value: `₹${monthlyRevenue.toLocaleString()}`,
      icon: Wallet,
      badge: {
        text: `${monthlyAppointments.flatMap((a) => a.payments).length} payments`,
        variant: "outline",
      },
      footnote: "This month",
    },
    {
      label: "Pending Approvals",
      value: String(pendingAppointments.length),
      icon: ClipboardList,
      badge: {
        text: `${urgentApprovals} Urgent`,
        variant: urgentApprovals > 0 ? "destructive" : "outline",
      },
      footnote: "Awaiting consultant approval",
    },
  ];

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
