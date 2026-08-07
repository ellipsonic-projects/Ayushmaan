import type { TenantAppointment } from "@/lib/api/appointments.server";

export type CalendarMember = {
  id: string;
  label: string;
  colorClass?: string;
};

export type SessionEvent = {
  id: string;
  caseId: string;
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
    caseId: caseRow.id,
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
