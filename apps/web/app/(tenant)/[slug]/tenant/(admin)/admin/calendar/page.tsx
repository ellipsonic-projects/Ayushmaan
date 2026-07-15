import { getTenantAppointments } from "@/lib/api/appointments.server";
import { getTenantConsultants } from "@/lib/api/consultants.server";
import { SessionCalendar } from "@/components/tenant/consultant/sessions/session-calendar";
import {
  appointmentToSessionEvent,
  type CalendarMember,
} from "@/components/tenant/consultant/sessions/session-data";

// One color per consultant so events are attributable at a glance, cycling
// once the roster outgrows the palette.
const MEMBER_COLORS = [
  "bg-emerald-600",
  "bg-violet-600",
  "bg-sky-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
];

export default async function TenantAdminCalendarPage() {
  const [appointments, consultants] = await Promise.all([
    getTenantAppointments(),
    getTenantConsultants(),
  ]);

  const consultantMembers: CalendarMember[] = consultants.map((consultant, index) => ({
    id: consultant.id,
    label: consultant.fullName,
    colorClass: MEMBER_COLORS[index % MEMBER_COLORS.length],
  }));
  const members: CalendarMember[] = [{ id: "all", label: "All consultants" }, ...consultantMembers];
  const colorByConsultantId = new Map(
    consultantMembers.map((member) => [member.id, member.colorClass!])
  );

  const events = appointments.map((appointment) =>
    appointmentToSessionEvent(
      appointment,
      colorByConsultantId.get(appointment.case.consultant.id) ?? "bg-secondary",
      appointment.case.consultant.id
    )
  );

  return (
    <div className="h-[calc(100vh-3.5rem-2.5rem)]">
      <SessionCalendar
        events={events}
        members={members}
        membersLabel="Consultants"
        initialChecked={{ all: true }}
      />
    </div>
  );
}
