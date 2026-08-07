"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface ConsultantSearchResult {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantDisplayName: string;
  fullName: string;
  bio: string | null;
  category: string;
  subSpecialization: string | null;
  consultationFee: string;
  currency: string;
  languagesSpoken: string[];
  ratingAvg: string;
  ratingCount: number;
}

// GET /api/clients/consultants — platform-wide consultant directory for a
// field, so the client picks a specific consultant directly (this doubles as
// their organization pick) instead of the flow auto-matching one. Like
// searchTenants used to, this never resolves a tenant via /api/auth/me, since
// a CLIENT account's user.tenantId is always null.
export async function searchConsultants(category: string): Promise<ConsultantSearchResult[]> {
  const headers = await authHeaders();
  const params = new URLSearchParams({ category });

  const res = await fetch(`${API_BASE_URL}/api/clients/consultants?${params.toString()}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as ConsultantSearchResult[];
}

import { authedFetchForTenant } from "@/lib/api/authed-fetch";

// The CLIENT projection: one entry per discrete bookable instant, already
// stepped from each recurring/one-off template's startTime..endTime by
// slotDurationMins and already excluding cutoff-window and already-booked
// times — server-side (consultants.router.ts's generateDiscreteAvailability).
export interface OpenAvailabilitySlot {
  start: string;
  end: string;
  durationMins: number;
  dateKey: string;
}

// GET /tenants/:tenantId/consultants/:consultantId/availability — the CLIENT
// projection: OPEN slots only, with booking_cutoff_hours already applied
// server-side (consultants.router.ts).
export async function getConsultantAvailability(
  tenantId: string,
  tenantSlug: string,
  consultantId: string
): Promise<OpenAvailabilitySlot[]> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/consultants/${consultantId}/availability`,
    { method: "GET" }
  );
  return data as OpenAvailabilitySlot[];
}

export async function createAppointmentForCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  body: { scheduledStart: string; scheduledEnd: string; meetingLink?: string }
) {
  return authedFetchForTenant(tenantId, tenantSlug, `/cases/${caseId}/appointments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface AppointmentSeriesOccurrence {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

export interface AppointmentSeriesResult {
  id: string;
  appointments: AppointmentSeriesOccurrence[];
}

// POST /cases/:caseId/appointment-series — recurring booking; expands
// recurrenceRule into individual appointments server-side (booking.service.ts).
export async function createAppointmentSeriesForCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  body: {
    recurrenceRule: {
      dayOfWeek: number;
      startTime: string;
      durationMins: number;
      startDate: string;
      endDate?: string;
      occurrenceCount?: number;
    };
  }
): Promise<AppointmentSeriesResult> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/appointment-series`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return data as AppointmentSeriesResult;
}

export interface RequestAppointmentResult {
  case: { id: string };
  appointment: { id: string };
}

export async function requestAppointmentWithTenant(
  tenantId: string,
  tenantSlug: string,
  body: {
    category: string;
    matterKey?: string;
    requirementsSubject?: string;
    requirements?: string;
    scheduledStart: string;
    scheduledEnd: string;
    meetingLink?: string;
    onBehalfOfClientId?: string;
    consultantId?: string;
  }
): Promise<RequestAppointmentResult> {
  const { data } = await authedFetchForTenant(tenantId, tenantSlug, `/cases/request`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as RequestAppointmentResult;
}
