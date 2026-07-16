"use client";

import { platformAuthedFetch } from "./platform-tenant.client";
import type { AppointmentStatus } from "./appointments.server";

export async function updatePlatformTenantAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  updates: {
    status?: AppointmentStatus;
    meetingLink?: string;
    cancellationReason?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  }
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
