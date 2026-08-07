import { Video, Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTenantAppointments, type AppointmentStatus } from "@/lib/api/appointments.server";
import { getPlatformTenantAppointments } from "@/lib/api/platform-appointments.server";

const statusVariant: Record<AppointmentStatus, "secondary" | "outline" | "destructive"> = {
  REQUESTED: "outline",
  ADMIN_APPROVED: "outline",
  RESCHEDULE_PROPOSED: "outline",
  APPROVED: "secondary",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const statusLabel: Record<AppointmentStatus, string> = {
  REQUESTED: "Pending",
  ADMIN_APPROVED: "Pending Consultant",
  RESCHEDULE_PROPOSED: "Pending",
  APPROVED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function UpcomingAppointments({
  platformTenant,
}: {
  platformTenant?: { tenantId: string; tenantSlug: string };
} = {}) {
  const query = { from: startOfToday().toISOString(), to: endOfToday().toISOString() };
  const appointments = platformTenant
    ? await getPlatformTenantAppointments(platformTenant.tenantId, platformTenant.tenantSlug, query)
    : await getTenantAppointments(query);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Today&apos;s Appointments</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            View Schedule
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Mode</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {new Date(appt.scheduledStart).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{appt.case.client.fullName}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {appt.case.consultant?.fullName ?? "Unassigned"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {appt.meetingLink ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5" />
                      )}
                      {appt.meetingLink ? "Video" : "In-Office"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusVariant[appt.status]}>{statusLabel[appt.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{appointments.length} appointments today</span>
        </div>
      </CardContent>
    </Card>
  );
}
