import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ConsultantProfile {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  category: string;
  subSpecialization: string | null;
  isAcceptingNewClients: boolean;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantConsultants(): Promise<ConsultantProfile[]> {
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

  const consultantsRes = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/consultants`, {
    headers: authHeaders,
  });
  if (!consultantsRes.ok) return [];
  const { data } = await consultantsRes.json();
  return data as ConsultantProfile[];
}
