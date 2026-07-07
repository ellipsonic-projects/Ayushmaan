import { CalendarClock, Download, Filter } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Appointment = {
  id: string;
  reference: string;
  client: string;
  consultant: string;
  scheduledFor: string;
  duration: string;
  mode: "Video" | "In-person" | "Phone";
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
};

const appointments: Appointment[] = [
  {
    id: "1",
    reference: "APT-20991",
    client: "Vanguard Tech Solutions",
    consultant: "Dr. Jonathan Davis",
    scheduledFor: "Jul 8, 2026 · 10:00 AM",
    duration: "45m",
    mode: "Video",
    status: "Confirmed",
  },
  {
    id: "2",
    reference: "APT-20987",
    client: "Global Logistics Corp",
    consultant: "Sarah Mitchell",
    scheduledFor: "Jul 8, 2026 · 1:30 PM",
    duration: "30m",
    mode: "Phone",
    status: "Pending",
  },
  {
    id: "3",
    reference: "APT-20975",
    client: "Pioneer Legal Partners",
    consultant: "Robert Blackstone",
    scheduledFor: "Jul 7, 2026 · 4:00 PM",
    duration: "1h",
    mode: "In-person",
    status: "Completed",
  },
  {
    id: "4",
    reference: "APT-20968",
    client: "MedCore Systems",
    consultant: "Elena Koziov",
    scheduledFor: "Jul 7, 2026 · 11:15 AM",
    duration: "45m",
    mode: "Video",
    status: "Completed",
  },
  {
    id: "5",
    reference: "APT-20954",
    client: "Northwind Traders",
    consultant: "Dr. Jonathan Davis",
    scheduledFor: "Jul 6, 2026 · 3:00 PM",
    duration: "30m",
    mode: "Video",
    status: "Cancelled",
  },
  {
    id: "6",
    reference: "APT-20941",
    client: "Apex Financial Group",
    consultant: "Sarah Mitchell",
    scheduledFor: "Jul 9, 2026 · 9:00 AM",
    duration: "1h",
    mode: "In-person",
    status: "Confirmed",
  },
];

const stats = [
  { label: "Scheduled Today", value: "18" },
  { label: "Completed This Week", value: "94" },
  { label: "Pending Confirmation", value: "7" },
  { label: "Cancellation Rate", value: "3.2%" },
];

const statusClass: Record<Appointment["status"], string> = {
  Confirmed:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export default function TenantAppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Appointments</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Acme Global Solutions · TNT-88921-XQ · {appointments.length} upcoming and recent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="size-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm">
        <CardContent className="px-0">
          <div className="max-h-112 overflow-auto px-4">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Reference</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Consultant</th>
                  <th className="py-2 pr-4 font-medium">Scheduled For</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 pr-4 font-medium">Mode</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-2.5 pr-4 font-medium">{appointment.reference}</td>
                    <td className="py-2.5 pr-4">{appointment.client}</td>
                    <td className="py-2.5 pr-4">{appointment.consultant}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {appointment.scheduledFor}
                    </td>
                    <td className="py-2.5 pr-4">{appointment.duration}</td>
                    <td className="py-2.5 pr-4">{appointment.mode}</td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", statusClass[appointment.status])}
                      >
                        {appointment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
