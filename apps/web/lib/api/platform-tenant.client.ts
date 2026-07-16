"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Shared mutate helper for SUPER_ADMIN pages acting on an arbitrary tenant's
// workspace. See platform-tenant.server.ts for why tenantId/tenantSlug are
// passed explicitly instead of resolved from the caller's own tenant.
export async function platformAuthedFetch(
  tenantId: string,
  tenantSlug: string,
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
      "X-Tenant-Slug": tenantSlug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}
