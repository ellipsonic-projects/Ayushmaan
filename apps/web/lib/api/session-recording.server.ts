import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface SessionAppointment {
  id: string;
  caseId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  case: {
    id: string;
    category: string;
    matterKey: string | null;
  };
}

export async function getSessionAppointment(
  appointmentId: string
): Promise<SessionAppointment | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return null;
  const { data: me } = await meRes.json();
  if (!me?.tenantId) return null;

  const tenantHeaders = { ...authHeaders, "X-Tenant-Slug": me.tenant.slug };

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/appointments/${appointmentId}`,
    {
      headers: tenantHeaders,
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return data as SessionAppointment;
}
