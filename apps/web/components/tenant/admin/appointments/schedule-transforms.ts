import { format } from "date-fns";

import type { TenantAppointment } from "@/lib/api/appointments.server";
import type { ScheduleEvent } from "@/components/tenant/admin/appointments/master-schedule-grid";
import type { PendingAppointment } from "@/components/tenant/admin/appointments/conflict-resolution-queue";

export const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
];

export function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function toTitleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function hoursBetween(startIso: string, endIso: string) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

export function toScheduleEvents(
  appointments: TenantAppointment[],
  includeDate = false
): ScheduleEvent[] {
  const active = appointments.filter((a) => a.status !== "CANCELLED");

  return active.map((appointment) => {
    const start = new Date(appointment.scheduledStart);
    const end = new Date(appointment.scheduledEnd);
    const startHour = Math.max(start.getHours() + start.getMinutes() / 60, 8);
    const endHour = Math.min(end.getHours() + end.getMinutes() / 60, 19);

    const overlaps = active.some(
      (other) =>
        other.id !== appointment.id &&
        other.case.consultant?.id === appointment.case.consultant?.id &&
        new Date(other.scheduledStart) < end &&
        new Date(other.scheduledEnd) > start
    );

    const variant: ScheduleEvent["variant"] = overlaps
      ? "conflict"
      : appointment.status === "NO_SHOW"
        ? "overtime"
        : "default";

    const tag = overlaps
      ? "BOOKING CONFLICT"
      : appointment.status === "REQUESTED"
        ? "PENDING APPROVAL"
        : appointment.status === "NO_SHOW"
          ? "NO SHOW"
          : undefined;

    return {
      id: appointment.id,
      title: appointment.case.client.fullName,
      time: includeDate
        ? `${format(start, "MMM d, hh:mm a")} - ${format(end, "hh:mm a")}`
        : `${format(start, "hh:mm a")} - ${format(end, "hh:mm a")}`,
      start: startHour,
      end: endHour,
      variant,
      tag,
    };
  });
}

export function toPendingAppointment(appointment: TenantAppointment): PendingAppointment {
  return {
    id: appointment.id,
    caseId: appointment.case.id,
    consultantName: appointment.case.consultant?.fullName ?? null,
    consultantCategory: appointment.case.consultant?.category ?? appointment.case.category,
    clientName: appointment.case.client.fullName,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    requirementsSubject: appointment.case.requirementsSubject,
    requirements: appointment.case.requirements,
    kind: appointment.status as PendingAppointment["kind"],
  };
}
