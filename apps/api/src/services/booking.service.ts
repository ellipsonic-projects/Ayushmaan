import type { Prisma } from "@ayushman/db";
import { AppError } from "../middleware/errorHandler";

// 409 on double-book (data_api_v4.md §11). A full slot-instance model (one
// row per bookable occurrence, expanded from a recurring AvailabilitySlot
// template) is a larger scheduling-engine feature than this booking-loop
// pass covers — this checks the thing that actually prevents a double-book:
// no two non-cancelled Appointments overlapping for the same consultant.
export async function assertNoConflict(
  tx: Prisma.TransactionClient,
  params: {
    consultantId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    excludeAppointmentId?: string;
  }
) {
  const conflict = await tx.appointment.findFirst({
    where: {
      id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
      status: { notIn: ["CANCELLED"] },
      scheduledStart: { lt: params.scheduledEnd },
      scheduledEnd: { gt: params.scheduledStart },
      case: { consultantId: params.consultantId },
    },
  });
  if (conflict) {
    throw new AppError(409, "This slot conflicts with an existing appointment", "SLOT_CONFLICT");
  }
}

export interface RecurrenceRule {
  dayOfWeek: number; // 0=Sunday..6=Saturday
  startTime: string; // "HH:mm"
  durationMins: number;
  startDate: string; // ISO date, first eligible occurrence
  endDate?: string; // ISO date, inclusive
  occurrenceCount?: number; // used when endDate isn't given
}

// Expands a recurrence rule into concrete occurrence datetimes. Simple
// calendar-day walk — no DST-aware slot math yet (PRD_v3 §5 Phase 3 calls
// that out as its own follow-up UI concern).
export function expandOccurrences(rule: RecurrenceRule): Array<{ start: Date; end: Date }> {
  const [hours, minutes] = rule.startTime.split(":").map(Number);
  const occurrences: Array<{ start: Date; end: Date }> = [];

  const cursor = new Date(rule.startDate);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getDay() !== rule.dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const end = rule.endDate ? new Date(rule.endDate) : null;
  const maxOccurrences = rule.occurrenceCount ?? (end ? Infinity : 1);

  while (occurrences.length < maxOccurrences) {
    if (end && cursor > end) break;

    const start = new Date(cursor);
    start.setHours(hours, minutes, 0, 0);
    const occurrenceEnd = new Date(start.getTime() + rule.durationMins * 60_000);
    occurrences.push({ start, end: occurrenceEnd });

    cursor.setDate(cursor.getDate() + 7);
    if (!end && !rule.occurrenceCount) break; // a single occurrence with neither bound given
  }

  return occurrences;
}
