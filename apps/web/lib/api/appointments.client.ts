"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authedFetch(path: string, init: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      "X-Tenant-Slug": me.tenant.slug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface UpdateAppointmentBody {
  status?:
    "ADMIN_APPROVED" | "APPROVED" | "RESCHEDULE_PROPOSED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  cancellationReason?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export async function updateAppointment(appointmentId: string, body: UpdateAppointmentBody) {
  await authedFetch(`/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function createAppointmentForClient(
  caseId: string,
  body: { scheduledStart: string; scheduledEnd: string; meetingLink?: string }
) {
  return authedFetch(`/cases/${caseId}/appointments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createClient(body: { email: string; fullName: string; phone?: string }) {
  const { data } = await authedFetch(`/clients`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as { id: string; clientProfile: { id: string; fullName: string } };
}

// POST /tenants/:tenantId/cases/:caseId/assign-consultant — how a
// TENANT_ADMIN approves a client's direct booking request: assigns a
// consultant to a PENDING_ASSIGNMENT case, which also moves its still-
// REQUESTED appointment(s) to ADMIN_APPROVED.
export async function assignConsultant(caseId: string, consultantId: string) {
  await authedFetch(`/cases/${caseId}/assign-consultant`, {
    method: "POST",
    body: JSON.stringify({ consultantId }),
  });
}

export async function createCase(body: {
  clientId: string;
  consultantId: string;
  category: string;
  requirements?: string;
}) {
  const { data } = await authedFetch(`/cases`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as { id: string };
}
