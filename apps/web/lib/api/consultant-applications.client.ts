"use client";

import { supabase } from "@/lib/supabase/client";
import type { OwnConsultantApplication } from "./consultant-applications.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return { Authorization: `Bearer ${session.access_token}` };
}

// GET /clients/consultant-invite-codes/:code — resolves which organization a
// TENANT_ADMIN-issued invite code belongs to, so the applicant can confirm
// before filling out the rest of the form.
export async function lookupConsultantInviteCode(
  code: string
): Promise<{ tenant: { displayName: string; slug: string; logoUrl: string | null } }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/clients/consultant-invite-codes/${code}`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  const { data } = await res.json();
  return data;
}

// POST /clients/consultant-applications — platform-level, same precedent as
// organizations.client.ts's searchTenants (a CLIENT account has no
// tenantId, so this never resolves tenant scope via /api/auth/me).
export async function submitConsultantApplication(input: {
  code: string;
  category: string;
  subSpecialization?: string;
  bio?: string;
  consultationFee?: number;
  currency?: string;
  languagesSpoken?: string[];
  message?: string;
}): Promise<OwnConsultantApplication> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/clients/consultant-applications`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  const { data } = await res.json();
  return data as OwnConsultantApplication;
}

export async function getMyConsultantApplications(): Promise<OwnConsultantApplication[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/clients/consultant-applications/me`, { headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as OwnConsultantApplication[];
}

import { authedFetch } from "@/lib/api/authed-fetch";

export async function approveConsultantApplication(applicationId: string) {
  const { data } = await authedFetch(`/consultant-applications/${applicationId}/approve`, {
    method: "POST",
  });
  return data;
}

export async function rejectConsultantApplication(applicationId: string, reason?: string) {
  const { data } = await authedFetch(`/consultant-applications/${applicationId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}
