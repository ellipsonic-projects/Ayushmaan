import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type AppointmentStatus =
  "REQUESTED" | "APPROVED" | "RESCHEDULE_PROPOSED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface TenantAppointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  meetingLink: string | null;
  case: {
    status: "ACTIVE" | "CLOSED";
    client: { id: string; fullName: string };
    consultant: {
      id: string;
      fullName: string;
      category: string;
      consultationFee: string;
      currency: string;
    };
  };
  payments: { amount: string; status: string; createdAt: string }[];
}

export interface TenantAppointmentsQuery {
  from?: string;
  to?: string;
  status?: AppointmentStatus;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantAppointments(
  query: TenantAppointmentsQuery = {}
): Promise<TenantAppointment[]> {
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

  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/appointments?${params.toString()}`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as TenantAppointment[];
}
