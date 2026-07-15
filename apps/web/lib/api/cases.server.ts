import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type CaseStatus = "ACTIVE" | "ON_HOLD" | "CLOSED";

export interface TenantCase {
  id: string;
  matterKey: string | null;
  category: string;
  tags: string[];
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  client: { fullName: string };
  consultant: { fullName: string };
  _count: {
    interactions: number;
    commitments: number;
    tasks: number;
    documents: number;
  };
}

// middleware.ts already guarantees the caller is a signed-in CONSULTANT
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantCases(): Promise<TenantCase[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return [];
  const { data: me } = await meRes.json();
  if (!me?.tenantId) return [];

  const tenantHeaders = { ...authHeaders, "X-Tenant-Slug": me.tenant.slug };

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/cases`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as TenantCase[];
}
