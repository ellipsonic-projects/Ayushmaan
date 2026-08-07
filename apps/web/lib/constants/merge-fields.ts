// Fixed merge-field registry for the template editor's Mention suggestion
// (Sprint 5.5.2 item 3) — the dot-path `id` on each entry is what's stored on
// a `mention` node's attrs and resolved by apps/api's
// template-render.service.ts against workflow_runs.context at send time.
export interface MergeField {
  id: string;
  label: string;
  group: "Client" | "Appointment" | "Consultant" | "Organization" | "Schedule";
}

export const MERGE_FIELDS: MergeField[] = [
  { id: "client.name", label: "Client name", group: "Client" },
  { id: "client.email", label: "Client email", group: "Client" },
  { id: "client.phone", label: "Client phone", group: "Client" },
  { id: "appointment.date", label: "Appointment date", group: "Appointment" },
  { id: "appointment.time", label: "Appointment time", group: "Appointment" },
  { id: "appointment.meetingLink", label: "Meeting link", group: "Appointment" },
  { id: "consultant.name", label: "Consultant name", group: "Consultant" },
  { id: "consultant.email", label: "Consultant email", group: "Consultant" },
  { id: "consultant.phone", label: "Consultant phone", group: "Consultant" },
  { id: "organization.name", label: "Organization name", group: "Organization" },
  { id: "organization.phone", label: "Organization phone", group: "Organization" },
  { id: "todayAppointments", label: "Today's appointments", group: "Schedule" },
  { id: "todayAppointmentCount", label: "Today's appointment count", group: "Schedule" },
];
