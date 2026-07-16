import type { TenantAppointment } from "@/lib/api/appointments.server";

export type CalendarMember = {
  id: string;
  label: string;
  colorClass?: string;
};

export type SessionEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memberId?: string;
  consultantName?: string;
  clientName: string;
  clientCode: string;
  clientStatus: "Lead" | "Active" | "Wait List" | "Closed";
  appointmentStatus:
    "Confirmed" | "Pending" | "Cancelled" | "Reschedule Proposed" | "Completed" | "No Show";
  paymentStatus: "Paid" | "Unpaid";
  serviceName: string;
  serviceDuration: string;
  servicePrice: string;
  description: string;
  colorClass: string;
};

// Kept for components/tenant/admin/calendar/calendar-data.ts, an already-
// unused mock file left over from before the admin calendar was migrated to
// real data (see admin/calendar/page.tsx) — not otherwise used here.
export function dateAt(daysFromMonday: number, hour: number, minute = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  const target = new Date(monday);
  target.setDate(monday.getDate() + daysFromMonday);
  target.setHours(hour, minute, 0, 0);
  return target;
}

export const APPOINTMENT_STATUS_LABEL: Record<
  TenantAppointment["status"],
  SessionEvent["appointmentStatus"]
> = {
  REQUESTED: "Pending",
  ADMIN_APPROVED: "Pending",
  APPROVED: "Confirmed",
  RESCHEDULE_PROPOSED: "Reschedule Proposed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

function formatDuration(startIso: string, endIso: string) {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return `${mins} mins`;
}

function formatPrice(fee: string, currency: string) {
  return currency === "INR" ? `₹${fee}` : `${currency} ${fee}`;
}

// Shared by the admin (all-consultants) and consultant (own-only) calendar
// pages — both fetch TenantAppointment rows and render them through the same
// SessionCalendar component.
export function appointmentToSessionEvent(
  appointment: TenantAppointment,
  colorClass: string,
  memberId?: string
): SessionEvent {
  const { case: caseRow, status } = appointment;
  const appointmentStatus = APPOINTMENT_STATUS_LABEL[status];
  const isPaid = appointment.payments.some((payment) => payment.status === "SUCCEEDED");

  const consultantName = caseRow.consultant?.fullName ?? "Unassigned";

  return {
    id: appointment.id,
    title: `${consultantName} · ${caseRow.client.fullName} - ${appointmentStatus}`,
    start: new Date(appointment.scheduledStart),
    end: new Date(appointment.scheduledEnd),
    memberId,
    consultantName,
    clientName: caseRow.client.fullName,
    clientCode: caseRow.client.id.slice(0, 6).toUpperCase(),
    clientStatus: caseRow.status === "ACTIVE" ? "Active" : "Closed",
    appointmentStatus,
    paymentStatus: isPaid ? "Paid" : "Unpaid",
    serviceName: caseRow.consultant
      ? `${caseRow.consultant.category} Consultation`
      : "Consultation",
    serviceDuration: formatDuration(appointment.scheduledStart, appointment.scheduledEnd),
    servicePrice: caseRow.consultant
      ? formatPrice(caseRow.consultant.consultationFee, caseRow.consultant.currency)
      : "—",
    description: `${appointmentStatus} appointment with ${caseRow.client.fullName}`,
    colorClass,
  };
}
