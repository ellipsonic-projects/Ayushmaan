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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stats = [
  { label: "Upcoming Appointments", value: "2", icon: CalendarClock },
  { label: "Completed Sessions", value: "14", icon: CheckCircle2 },
  { label: "Documents Shared", value: "6", icon: FileText },
];

const upcomingAppointments = [
  {
    title: "Follow-up Consultation",
    consultant: "Dr. Aris Thorne",
    date: "Thu, Jul 9, 2026",
    time: "10:30 AM – 11:15 AM",
    mode: "Video call",
    status: "confirmed",
  },
  {
    title: "Therapy Session",
    consultant: "Dr. Mira Kapoor",
    date: "Tue, Jul 14, 2026",
    time: "3:00 PM – 4:00 PM",
    mode: "In person",
    status: "scheduled",
  },
];

const pastAppointments = [
  {
    title: "Initial Assessment",
    consultant: "Dr. Aris Thorne",
    date: "Mon, Jun 29, 2026",
    time: "10:00 AM – 11:00 AM",
    mode: "Video call",
    status: "completed",
  },
  {
    title: "Therapy Session",
    consultant: "Dr. Mira Kapoor",
    date: "Wed, Jun 17, 2026",
    time: "3:00 PM – 4:00 PM",
    mode: "In person",
    status: "completed",
  },
  {
    title: "Intake Call",
    consultant: "Dr. Aris Thorne",
    date: "Fri, Jun 5, 2026",
    time: "9:00 AM – 9:30 AM",
    mode: "Video call",
    status: "cancelled",
  },
];

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  confirmed: "default",
  scheduled: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

function AppointmentCard({
  appointment,
}: {
  appointment: (typeof upcomingAppointments)[number];
}) {
  const ModeIcon = appointment.mode === "Video call" ? Video : MapPin;
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {appointment.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {appointment.consultant}
          </p>
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
            {appointment.status}
          </Badge>
          {(appointment.status === "confirmed" ||
            appointment.status === "scheduled") && (
            <Button variant="outline" size="sm">
              Reschedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, Joker
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep track of all upcoming and past appointments
          </p>
        </div>
        <Button asChild className="w-fit gap-2">
          <Link href="/slug/tenant/client/appointments/book">
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
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={`${appointment.title}-${appointment.date}`}
                  appointment={appointment}
                />
              ))}
            </TabsContent>
            <TabsContent value="past" className="mt-3 flex flex-col gap-3">
              {pastAppointments.map((appointment) => (
                <AppointmentCard
                  key={`${appointment.title}-${appointment.date}`}
                  appointment={appointment}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
