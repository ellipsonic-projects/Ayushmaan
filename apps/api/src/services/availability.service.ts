import type { Prisma } from "@ayushman/db";

interface AvailabilityTemplate {
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: Date;
  endTime: Date;
  slotDurationMins: number;
}

interface AppointmentWindow {
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface DiscreteAvailabilityInstance {
  start: string;
  end: string;
  durationMins: number;
  dateKey: string;
}

// Steps each matching template's startTime..endTime window by
// slotDurationMins for every day in [from, to], skipping instances that
// fall inside the booking cutoff or overlap an existing appointment.
// specificDate templates take precedence over a dayOfWeek template for the
// same day (mirrors book-appointment-flow.tsx's client-side precedence).
export function generateDiscreteAvailability(
  templates: AvailabilityTemplate[],
  appointments: AppointmentWindow[],
  from: Date,
  to: Date,
  cutoffMs: number,
  now: number
): DiscreteAvailabilityInstance[] {
  const results: DiscreteAvailabilityInstance[] = [];
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  for (let dayMs = fromDay; dayMs <= toDay; dayMs += 86_400_000) {
    const day = new Date(dayMs);
    const dateKey = day.toISOString().slice(0, 10);
    const weekday = day.getUTCDay();

    const specificMatches = templates.filter(
      (t) => t.specificDate && t.specificDate.toISOString().slice(0, 10) === dateKey
    );
    const dayTemplates =
      specificMatches.length > 0
        ? specificMatches
        : templates.filter((t) => !t.specificDate && t.dayOfWeek === weekday);

    for (const template of dayTemplates) {
      const stepMs = template.slotDurationMins * 60_000;
      const startOfWindowMs =
        dayMs +
        template.startTime.getUTCHours() * 3_600_000 +
        template.startTime.getUTCMinutes() * 60_000;
      const endOfWindowMs =
        dayMs +
        template.endTime.getUTCHours() * 3_600_000 +
        template.endTime.getUTCMinutes() * 60_000;

      let cursorMs = startOfWindowMs;
      while (cursorMs + stepMs <= endOfWindowMs) {
        const start = new Date(cursorMs);
        const end = new Date(cursorMs + stepMs);

        const pastCutoff = start.getTime() - now < cutoffMs;
        const conflicts = appointments.some(
          (a) => a.scheduledStart < end && a.scheduledEnd > start
        );

        if (!pastCutoff && !conflicts) {
          results.push({
            start: start.toISOString(),
            end: end.toISOString(),
            durationMins: template.slotDurationMins,
            dateKey,
          });
        }
        cursorMs += stepMs;
      }
    }
  }

  return results.sort((a, b) => a.start.localeCompare(b.start));
}

// Materializes a tenant's recurring availability defaults (set by
// TENANT_ADMIN in Settings) into real per-consultant AvailabilitySlot rows.
// Tenant defaults are authoritative for recurring (dayOfWeek) hours — any
// existing recurring slot that doesn't exactly match one of that weekday's
// current default windows (start, end, duration) is stale, regardless of
// whether its own window used to be a valid default. For each existing slot:
//
//   1. No default shares its (day, start, end) window at all, OPEN  → delete
//      (nothing to patch to — the tenant no longer configures this window).
//   2. No default shares its window, BOOKED                        → leave
//      untouched; the in-flight appointment stores its own
//      scheduledStart/scheduledEnd, so it's unaffected. Cleaned up on the
//      next reconciliation after the appointment clears.
//   3. Window matches a default, same duration                     → skip
//      (idempotent).
//   4. Window matches a default, different duration, OPEN          → delete
//      + recreate so clients immediately see the new step size.
//   5. Window matches a default, different duration, BOOKED        → patch
//      slotDurationMins in-place without touching status/version.
//
// Any default window left without a satisfying slot afterward gets created.
//
// Safe to call on onboarding and on every "Save" in Settings.
export async function applyTenantAvailabilityDefaults(
  tx: Prisma.TransactionClient,
  tenantId: string,
  consultantId: string
) {
  const [defaults, existingSlots] = await Promise.all([
    tx.tenantAvailabilityDefault.findMany({ where: { tenantId } }),
    tx.availabilitySlot.findMany({
      where: { consultantId, dayOfWeek: { not: null } },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        slotDurationMins: true,
        status: true,
      },
    }),
  ]);

  // Group defaults per day — a tenant may configure more than one window per
  // weekday (e.g. split shifts).
  const defaultsByDay = new Map<number, typeof defaults>();
  for (const d of defaults) {
    const bucket = defaultsByDay.get(d.dayOfWeek) ?? [];
    bucket.push(d);
    defaultsByDay.set(d.dayOfWeek, bucket);
  }

  const windowKey = (startTime: Date, endTime: Date) =>
    `${startTime.getTime()}:${endTime.getTime()}`;
  const defaultKey = (d: (typeof defaults)[number]) =>
    `${d.dayOfWeek}:${windowKey(d.startTime, d.endTime)}:${d.slotDurationMins}`;

  const staleIds: string[] = [];
  const toCreate: typeof defaults = [];
  const bookedUpdates: Array<{ id: string; slotDurationMins: number }> = [];
  // Defaults already satisfied by a surviving (or about-to-be-patched)
  // slot — these must not be recreated.
  const satisfied = new Set<string>();

  for (const existing of existingSlots) {
    const dayDefaults = defaultsByDay.get(existing.dayOfWeek!) ?? [];
    const matchingWindow = dayDefaults.find(
      (d) => windowKey(d.startTime, d.endTime) === windowKey(existing.startTime, existing.endTime)
    );

    if (!matchingWindow) {
      // No default configures this window at all for this weekday.
      if (existing.status === "OPEN") {
        staleIds.push(existing.id); // rule 1
      }
      // rule 2 — BOOKED with no matching default: leave untouched.
      continue;
    }

    if (matchingWindow.slotDurationMins === existing.slotDurationMins) {
      satisfied.add(defaultKey(matchingWindow)); // rule 3 — exact match, keep
      continue;
    }

    if (existing.status === "OPEN") {
      staleIds.push(existing.id); // rule 4 — wrong duration, replace
    } else {
      bookedUpdates.push({ id: existing.id, slotDurationMins: matchingWindow.slotDurationMins }); // rule 5
      satisfied.add(defaultKey(matchingWindow)); // patched in place, no create needed
    }
  }

  for (const d of defaults) {
    if (!satisfied.has(defaultKey(d))) {
      toCreate.push(d);
    }
  }

  const ops: Promise<unknown>[] = [];

  if (staleIds.length > 0) {
    ops.push(tx.availabilitySlot.deleteMany({ where: { id: { in: staleIds } } }));
  }

  for (const { id, slotDurationMins } of bookedUpdates) {
    ops.push(
      tx.availabilitySlot.update({
        where: { id },
        data: { slotDurationMins },
        // status and version are intentionally left unchanged.
      })
    );
  }

  await Promise.all(ops);

  return Promise.all(
    toCreate.map((d) =>
      tx.availabilitySlot.create({
        data: {
          tenantId,
          consultantId,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          slotDurationMins: d.slotDurationMins,
        },
      })
    )
  );
}
