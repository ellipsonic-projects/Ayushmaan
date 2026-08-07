"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import type { TenantClient } from "@/lib/api/clients.server";

// GET /clients?search= — reused for the "New Appointment" global button's
// client autocomplete. Server-side already scopes results to this
// consultant's own case-linked clients (clients.router.ts GET /).
export async function searchOwnClients(search: string): Promise<TenantClient[]> {
  const { data } = await authedFetch(`/clients?search=${encodeURIComponent(search)}`, {
    method: "GET",
  });
  return data;
}

export interface BookConsultantAppointmentInput {
  clientId: string;
  caseMode: "NEW" | "EXISTING";
  caseId?: string;
  category?: string;
  matterKey?: string;
  scheduledStart: string;
  scheduledEnd: string;
}

// POST /consultants/:consultantId/appointments — instructions.md §1.
// Consultant-initiated ad-hoc booking with an explicit new/existing case
// choice; the appointment is created straight into APPROVED.
export async function bookConsultantAppointment(
  consultantId: string,
  input: BookConsultantAppointmentInput
): Promise<{ id: string }> {
  const { data } = await authedFetch(`/consultants/${consultantId}/appointments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}
