import { format } from "date-fns";

import { ScheduleHeader } from "@/components/tenant/admin/consultants/schedule-header";
import {
  MasterScheduleGrid,
  type ScheduleConsultant,
  type ScheduleEvent,
} from "@/components/tenant/admin/consultants/master-schedule-grid";
import {
  ConflictResolutionQueue,
  type PendingAppointment,
} from "@/components/tenant/admin/consultants/conflict-resolution-queue";
import {
  ResourceUtilization,
  type ConsultantUtilization,
} from "@/components/tenant/admin/consultants/resource-utilization";
import { getTenantAppointments, type TenantAppointment } from "@/lib/api/appointments.server";
import {
  getTenantConsultants,
  getTenantConsultantAvailability,
  type ConsultantProfile,
} from "@/lib/api/consultants.server";

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
];

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toTitleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function hoursBetween(startIso: string, endIso: string) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

function toScheduleEvents(appointments: TenantAppointment[]): ScheduleEvent[] {
  const active = appointments.filter((a) => a.status !== "CANCELLED");

  return active.map((appointment) => {
    const start = new Date(appointment.scheduledStart);
    const end = new Date(appointment.scheduledEnd);
    const startHour = Math.max(start.getHours() + start.getMinutes() / 60, 8);
    const endHour = Math.min(end.getHours() + end.getMinutes() / 60, 19);

    const overlaps = active.some(
      (other) =>
        other.id !== appointment.id &&
        other.case.consultant.id === appointment.case.consultant.id &&
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
      time: `${format(start, "hh:mm a")} - ${format(end, "hh:mm a")}`,
      start: startHour,
      end: endHour,
      variant,
      tag,
    };
  });
}

function toPendingAppointment(appointment: TenantAppointment): PendingAppointment {
  return {
    id: appointment.id,
    consultantName: appointment.case.consultant.fullName,
    clientName: appointment.case.client.fullName,
    scheduledStart: appointment.scheduledStart,
    kind: appointment.status as PendingAppointment["kind"],
  };
}

export default async function ConsultantsSchedulePage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayWeekday = todayStart.getDay();
  const todayDateStr = format(todayStart, "yyyy-MM-dd");

  const [consultants, todaysAppointments, requested, rescheduleProposed] = await Promise.all([
    getTenantConsultants(),
    getTenantAppointments({ from: todayStart.toISOString(), to: todayEnd.toISOString() }),
    getTenantAppointments({ status: "REQUESTED" }),
    getTenantAppointments({ status: "RESCHEDULE_PROPOSED" }),
  ]);

  const availabilityByConsultant = new Map(
    await Promise.all(
      consultants.map(
        async (consultant) =>
          [consultant.id, await getTenantConsultantAvailability(consultant.id)] as const
      )
    )
  );

  const appointmentsByConsultant = new Map<string, TenantAppointment[]>();
  for (const appointment of todaysAppointments) {
    const list = appointmentsByConsultant.get(appointment.case.consultant.id) ?? [];
    list.push(appointment);
    appointmentsByConsultant.set(appointment.case.consultant.id, list);
  }

  const scheduleConsultants: ScheduleConsultant[] = consultants.map((consultant, index) => ({
    id: consultant.id,
    name: consultant.fullName,
    role: toTitleCase(consultant.category),
    initials: initialsOf(consultant.fullName),
    avatarClass: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    events: toScheduleEvents(appointmentsByConsultant.get(consultant.id) ?? []),
  }));

  const utilization: ConsultantUtilization[] = consultants.map((consultant: ConsultantProfile) => {
    const slots = availabilityByConsultant.get(consultant.id) ?? [];
    const availableHours = slots
      .filter((slot) => slot.status !== "BLOCKED")
      .filter(
        (slot) =>
          (slot.dayOfWeek !== null && slot.dayOfWeek === todayWeekday) ||
          (slot.specificDate !== null && slot.specificDate.slice(0, 10) === todayDateStr)
      )
      .reduce((sum, slot) => sum + hoursBetween(slot.startTime, slot.endTime), 0);

    const bookedHours = (appointmentsByConsultant.get(consultant.id) ?? [])
      .filter((appointment) => appointment.status !== "CANCELLED")
      .reduce(
        (sum, appointment) =>
          sum + hoursBetween(appointment.scheduledStart, appointment.scheduledEnd),
        0
      );

    return {
      id: consultant.id,
      name: consultant.fullName,
      utilization: availableHours > 0 ? Math.round((bookedHours / availableHours) * 100) : 0,
    };
  });

  const pendingItems: PendingAppointment[] = [...requested, ...rescheduleProposed]
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .map(toPendingAppointment);

  return (
    <div className="flex flex-col gap-6">
      <ScheduleHeader />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ConflictResolutionQueue initialItems={pendingItems} />
        </div>
        <div className="xl:col-span-1">
          <ResourceUtilization consultants={utilization} />
        </div>
      </div>

      <MasterScheduleGrid consultants={scheduleConsultants} />
    </div>
  );
}
