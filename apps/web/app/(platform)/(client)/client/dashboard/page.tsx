import Link from "next/link";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOwnClientProfile, type ClientAppointmentStatus } from "@/lib/api/clients.server";

interface DashboardAppointment {
  id: string;
  title: string;
  consultant: string;
  date: string;
  time: string;
  mode: string;
  status: ClientAppointmentStatus;
}

const UPCOMING_STATUSES: ClientAppointmentStatus[] = [
  "REQUESTED",
  "ADMIN_APPROVED",
  "APPROVED",
  "RESCHEDULE_PROPOSED",
];

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPROVED: "default",
  ADMIN_APPROVED: "default",
  REQUESTED: "secondary",
  RESCHEDULE_PROPOSED: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString("en-US", opts)} – ${end.toLocaleTimeString("en-US", opts)}`;
}

function AppointmentCard({ appointment }: { appointment: DashboardAppointment }) {
  const ModeIcon = appointment.mode === "Video call" ? Video : MapPin;
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{appointment.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{appointment.consultant}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {appointment.date} · {appointment.time}
            </span>
            <span className="flex items-center gap-1.5">
              <ModeIcon className="h-3.5 w-3.5" />
              {appointment.mode}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={statusVariant[appointment.status] ?? "outline"}>
            {appointment.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
          {(appointment.status === "APPROVED" || appointment.status === "REQUESTED") && (
            <Button variant="outline" size="sm">
              Reschedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ClientDashboardPage() {
  const client = await getOwnClientProfile();
  const now = Date.now();

  const upcoming = (client?.cases ?? [])
    .flatMap((c) =>
      c.appointments.map((a) => ({
        ...a,
        consultantName: c.consultant?.fullName ?? "Unassigned",
        caseStatus: c.status,
      }))
    )
    .filter(
      (a) => UPCOMING_STATUSES.includes(a.status) && new Date(a.scheduledStart).getTime() >= now
    )
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  const past = (client?.cases ?? [])
    .flatMap((c) =>
      c.appointments.map((a) => ({
        ...a,
        consultantName: c.consultant?.fullName ?? "Unassigned",
        caseStatus: c.status,
      }))
    )
    .filter(
      (a) =>
        a.status === "COMPLETED" ||
        a.status === "CANCELLED" ||
        a.status === "NO_SHOW" ||
        (UPCOMING_STATUSES.includes(a.status) && new Date(a.scheduledStart).getTime() < now)
    )
    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());

  const toCard = (a: (typeof upcoming)[number]): DashboardAppointment => {
    const start = new Date(a.scheduledStart);
    const end = new Date(a.scheduledEnd);
    return {
      id: a.id,
      title: `Session with ${a.consultantName}`,
      consultant: a.consultantName,
      date: formatDate(start),
      time: formatTimeRange(start, end),
      mode: a.meetingLink ? "Video call" : "In person",
      status: a.status,
    };
  };

  const completedCount = (client?.cases ?? []).reduce(
    (sum, c) => sum + c.appointments.filter((a) => a.status === "COMPLETED").length,
    0
  );
  const documentsCount = (client?.cases ?? []).reduce((sum, c) => sum + c._count.documents, 0);

  const stats = [
    { label: "Upcoming Appointments", value: String(upcoming.length), icon: CalendarClock },
    { label: "Completed Sessions", value: String(completedCount), icon: CheckCircle2 },
    { label: "Documents Shared", value: String(documentsCount), icon: FileText },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back{client?.fullName ? `, ${client.fullName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep track of all upcoming and past appointments
          </p>
        </div>
        <Button asChild className="w-fit gap-2">
          <Link href="/client/appointments/book">
            <CalendarPlus className="h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-3 flex flex-col gap-3">
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No upcoming appointments.
                </p>
              ) : (
                upcoming.map((a) => <AppointmentCard key={a.id} appointment={toCard(a)} />)
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-3 flex flex-col gap-3">
              {past.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No past appointments.
                </p>
              ) : (
                past.map((a) => <AppointmentCard key={a.id} appointment={toCard(a)} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
