import type { TenantAppointment } from "@/lib/api/appointments.server";

export interface PendingApprovalItem {
  id: string;
  seriesId: string | null;
  caseId: string;
  clientName: string;
  consultantName: string | null;
  consultantCategory: string;
  scheduledStart: string;
  scheduledEnd: string;
  requirementsSubject: string | null;
  requirements: string | null;
}

export function toPendingApprovalItem(appointment: TenantAppointment): PendingApprovalItem {
  return {
    id: appointment.id,
    seriesId: appointment.seriesId,
    caseId: appointment.case.id,
    clientName: appointment.case.client.fullName,
    consultantName: appointment.case.consultant?.fullName ?? null,
    consultantCategory: appointment.case.consultant?.category ?? appointment.case.category,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    requirementsSubject: appointment.case.requirementsSubject,
    requirements: appointment.case.requirements,
  };
}
