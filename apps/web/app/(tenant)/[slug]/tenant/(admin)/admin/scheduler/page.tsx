import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

import {
  ScheduleHeader,
  type ScheduleRange,
} from "@/components/tenant/admin/appointments/schedule-header";
import {
  MasterScheduleGrid,
  type ScheduleConsultant,
} from "@/components/tenant/admin/appointments/master-schedule-grid";
import {
  ConflictResolutionQueue,
  type PendingAppointment,
} from "@/components/tenant/admin/appointments/conflict-resolution-queue";
import {
  ResourceUtilization,
  type ConsultantUtilization,
} from "@/components/tenant/admin/appointments/resource-utilization";
import { getTenantAppointments, type TenantAppointment } from "@/lib/api/appointments.server";
import {
  getTenantConsultants,
  getTenantConsultantAvailability,
  type ConsultantProfile,
} from "@/lib/api/consultants.server";
import {
  AVATAR_PALETTE,
  initialsOf,
  toTitleCase,
  hoursBetween,
  toScheduleEvents,
  toPendingAppointment,
} from "@/components/tenant/admin/appointments/schedule-transforms";

export default async function ConsultantsSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: ScheduleRange }>;
}) {
  const { range } = await searchParams;
  const selectedRange: ScheduleRange = range ?? "today";

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayWeekday = todayStart.getDay();
  const todayDateStr = format(todayStart, "yyyy-MM-dd");

  const rangeStart =
    selectedRange === "week"
      ? startOfWeek(now, { weekStartsOn: 1 })
      : selectedRange === "month"
        ? startOfMonth(now)
        : todayStart;
  const rangeEnd =
    selectedRange === "week"
      ? endOfWeek(now, { weekStartsOn: 1 })
      : selectedRange === "month"
        ? endOfMonth(now)
        : todayEnd;
  const rangeLabel =
    selectedRange === "today"
      ? format(now, "MMM d, yyyy")
      : `${format(rangeStart, "MMM d")} - ${format(rangeEnd, "MMM d, yyyy")}`;

  const [consultants, todaysAppointments, rangeAppointments, requested, rescheduleProposed] =
    await Promise.all([
      getTenantConsultants(),
      getTenantAppointments({ from: todayStart.toISOString(), to: todayEnd.toISOString() }),
      selectedRange === "today"
        ? Promise.resolve(null)
        : getTenantAppointments({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() }),
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

  function groupByConsultant(appointments: TenantAppointment[]) {
    const map = new Map<string, TenantAppointment[]>();
    for (const appointment of appointments) {
      // Appointments awaiting a consultant assignment (pending case-requests)
      // have no consultant column to sit under yet.
      if (!appointment.case.consultant) continue;
      const list = map.get(appointment.case.consultant.id) ?? [];
      list.push(appointment);
      map.set(appointment.case.consultant.id, list);
    }
    return map;
  }

  const todaysAppointmentsByConsultant = groupByConsultant(todaysAppointments);
  const gridAppointmentsByConsultant = groupByConsultant(rangeAppointments ?? todaysAppointments);

  const scheduleConsultants: ScheduleConsultant[] = consultants.map((consultant, index) => ({
    id: consultant.id,
    name: consultant.fullName,
    role: toTitleCase(consultant.category),
    initials: initialsOf(consultant.fullName),
    avatarClass: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    events: toScheduleEvents(
      gridAppointmentsByConsultant.get(consultant.id) ?? [],
      selectedRange !== "today"
    ),
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

    const bookedHours = (todaysAppointmentsByConsultant.get(consultant.id) ?? [])
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
      <ScheduleHeader rangeLabel={rangeLabel} />

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
