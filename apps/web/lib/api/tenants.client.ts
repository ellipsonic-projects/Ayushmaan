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
