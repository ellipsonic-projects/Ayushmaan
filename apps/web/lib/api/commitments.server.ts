import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface MyCommitment {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "ACTIVE" | "COMPLETED" | "DISCONTINUED";
  case: { id: string; client: { fullName: string } };
}

export interface MyTask {
  id: string;
  title: string;
  dueAt: string | null;
  status: "OPEN" | "COMPLETED" | "OVERDUE";
  case: { id: string; client: { fullName: string } };
}

// middleware.ts already guarantees the caller is a signed-in CONSULTANT
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getMyCommitments(consultantId: string): Promise<MyCommitment[]> {
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}/commitments`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as MyCommitment[];
}

export async function getMyTasks(consultantId: string): Promise<MyTask[]> {
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}/tasks`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as MyTask[];
}
