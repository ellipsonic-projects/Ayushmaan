import { getTenantAppointments } from "@/lib/api/appointments.server";
import { SessionCalendar } from "@/components/tenant/consultant/sessions/session-calendar";
import { appointmentToSessionEvent } from "@/components/tenant/consultant/sessions/session-data";

// CONSULTANT-authenticated calls to /appointments are already scoped
// server-side to the caller's own cases (appointments.router.ts), so no
// extra filtering is needed here — this never sees tenant-wide data.
export default async function ConsultantSessionsPage() {
  const appointments = await getTenantAppointments();
  const events = appointments.map((appointment) =>
    appointmentToSessionEvent(appointment, "bg-secondary", "you")
  );

  return (
    <div className="h-[calc(100vh-3.5rem-2.5rem)]">
      <SessionCalendar
        events={events}
        members={[{ id: "you", label: "You" }]}
        membersLabel="Consultant"
      />
    </div>
  );
}
