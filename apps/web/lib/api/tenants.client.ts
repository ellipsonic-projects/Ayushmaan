"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function platformAuthedFetch(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE_URL}/api/platform/tenants${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export async function approvePlatformTenant(tenantId: string) {
  await platformAuthedFetch(`/${tenantId}/approve`, { method: "POST" });
}

export async function rejectPlatformTenant(tenantId: string, reason: string) {
  await platformAuthedFetch(`/${tenantId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendPlatformTenant(tenantId: string) {
  await platformAuthedFetch(`/${tenantId}/suspend`, { method: "POST" });
}

export async function reinstatePlatformTenant(tenantId: string) {
  await platformAuthedFetch(`/${tenantId}/reinstate`, { method: "POST" });
}

export async function updatePlatformTenant(
  tenantId: string,
  updates: {
    displayName?: string;
    logoUrl?: string;
    planTier?: "STANDARD" | "PRO" | "ENTERPRISE";
  },
  reason: string
) {
  await platformAuthedFetch(`/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...updates, reason }),
  });
}

export interface TenantBilling {
  tenantId: string;
  planName: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  updatedAt: string;
}

// GET /tenants/:tenantId/billing — TENANT_ADMIN's own-tenant billing view
// (distinct from the SUPER_ADMIN platform console fetchers above).
export async function getOwnTenantBilling(): Promise<TenantBilling> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/billing`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as TenantBilling;
}

export interface TenantProfile {
  displayName: string;
  phone: string | null;
  address: string | null;
}

// GET/PATCH /tenants/:tenantId/profile — TENANT_ADMIN's own organization
// profile (displayName/phone/address), the fields shown on the
// template-header.ts contact block prepended to message/form templates.
export async function getOwnTenantProfile(): Promise<TenantProfile> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/profile`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as TenantProfile;
}

export async function updateOwnTenantProfile(
  updates: Partial<Pick<TenantProfile, "displayName" | "phone" | "address">>
): Promise<TenantProfile> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/profile`, {
    method: "PATCH",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      "X-Tenant-Slug": me.tenant.slug,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as TenantProfile;
}
