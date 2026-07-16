import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getTenantAppointments } from "@/lib/api/appointments.server";
import { getPlatformTenantAppointments } from "@/lib/api/platform-appointments.server";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDaysAgo(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function RevenueOverview({
  platformTenant,
}: {
  platformTenant?: { tenantId: string; tenantSlug: string };
} = {}) {
  const from = startOfDaysAgo(6);
  const appointments = platformTenant
    ? await getPlatformTenantAppointments(platformTenant.tenantId, platformTenant.tenantSlug, {
        from: from.toISOString(),
      })
    : await getTenantAppointments({ from: from.toISOString() });

  const totalsByDay = new Map<string, number>();
  for (const appt of appointments) {
    for (const payment of appt.payments) {
      if (payment.status !== "SUCCEEDED") continue;
      const key = new Date(payment.createdAt).toDateString();
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(payment.amount));
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDaysAgo(6 - i);
    return {
      date,
      label: DAY_LABELS[date.getDay()],
      total: totalsByDay.get(date.toDateString()) ?? 0,
    };
  });

  const maxTotal = Math.max(1, ...days.map((d) => d.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Consultation earnings, last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-3">
          {days.map((day) => (
            <div key={day.date.toDateString()} className="flex flex-1 flex-col items-center gap-2">
              <span
                className="w-full rounded-md bg-primary/80"
                style={{ height: `${(day.total / maxTotal) * 100}%` }}
                title={`₹${day.total.toLocaleString()}`}
              />
              <span className="text-xs font-medium text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
