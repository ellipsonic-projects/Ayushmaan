"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface TenantSearchResult {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
}

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return { Authorization: `Bearer ${session.access_token}` };
}

// GET /api/clients/tenants — platform-wide organization search. Unlike
// appointments.client.ts's authedFetch, this never resolves a tenant via
// /api/auth/me, since a CLIENT account's user.tenantId is always null.
export async function searchTenants(query: string): Promise<TenantSearchResult[]> {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());

  const res = await fetch(`${API_BASE_URL}/api/clients/tenants?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as TenantSearchResult[];
}

// Tenant-explicit fetch for a CLIENT calling into a specific organization
// they picked from search — takes tenantId/tenantSlug directly rather than
// resolving them from /api/auth/me (which can't work for a platform-level
// CLIENT account).
async function authedFetchForTenant(
  tenantId: string,
  tenantSlug: string,
  path: string,
  init: RequestInit
) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}${path}`, {
    ...init,
    headers: {
      ...headers,
      "X-Tenant-Slug": tenantSlug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
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

export async function requestAppointmentWithTenant(
  tenantId: string,
  tenantSlug: string,
  body: {
    category: string;
    matterKey?: string;
    requirements?: string;
    scheduledStart: string;
    scheduledEnd: string;
    meetingLink?: string;
  }
) {
  return authedFetchForTenant(tenantId, tenantSlug, `/cases/request`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
