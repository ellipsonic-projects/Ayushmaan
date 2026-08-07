"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Performs an authenticated fetch to /api/tenants/{tenantId}{path} using explicit tenant parameters.
 */
export async function authedFetchForTenant(
  tenantId: string,
  tenantSlug: string | undefined,
  path: string,
  init: RequestInit = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Performs an authenticated fetch to /api/platform{path} — no tenant at all,
 * used by SUPER_ADMIN-authored COMMUNITY workflows/templates (tenant_id
 * null), which have no tenant to resolve or pass.
 */
export async function authedFetchPlatform(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE_URL}/api/platform${path}`, {
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

/**
 * Perform an authenticated fetch by resolving the current user's tenant from `/api/auth/me`.
 */
export async function authedFetch(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  return authedFetchForTenant(me.tenantId, me.tenant?.slug, path, init);
}
