import { getOwnClientProfile } from "@/lib/api/clients.server";
import {
  ClientAppointmentsView,
  type ClientAppointmentRow,
} from "@/components/tenant/client/appointments/client-appointments-view";

export default async function ClientAppointmentsPage() {
  const profile = await getOwnClientProfile();

  const people = profile ? [profile, ...profile.dependents] : [];
  const rows: ClientAppointmentRow[] = people.flatMap((person) =>
    person.cases.flatMap((c) =>
      c.appointments.map((appt) => ({
        id: appt.id,
        scheduledStart: appt.scheduledStart,
        scheduledEnd: appt.scheduledEnd,
        status: appt.status,
        meetingLink: appt.meetingLink,
        forName: person.id === profile?.id ? null : person.fullName,
        consultantName: c.consultant?.fullName ?? "Unassigned",
        tenantId: c.tenantId,
        tenantSlug: c.tenant.slug,
        tenantName: c.tenant.displayName,
      }))
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Appointments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Respond to reschedule proposals and manage your upcoming sessions.
        </p>
      </div>
      <ClientAppointmentsView initialRows={rows} />
    </div>
  );
}
