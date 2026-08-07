import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ConsultantApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OwnConsultantApplication {
  id: string;
  tenantId: string;
  category: string;
  subSpecialization: string | null;
  bio: string | null;
  consultationFee: string;
  currency: string;
  languagesSpoken: string[];
  message: string | null;
  status: ConsultantApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
  tenant: { displayName: string; slug: string; logoUrl: string | null };
}

// GET /clients/consultant-applications/me — a CLIENT's own application
// history, same platform-level shape as getOwnClientProfile (clients.server.ts).
export async function getOwnConsultantApplications(): Promise<OwnConsultantApplication[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const res = await fetch(`${API_BASE_URL}/api/clients/consultant-applications/me`, {
    headers: authHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as OwnConsultantApplication[];
}

export interface TenantConsultantApplication {
  id: string;
  category: string;
  subSpecialization: string | null;
  bio: string | null;
  consultationFee: string;
  currency: string;
  languagesSpoken: string[];
  message: string | null;
  status: ConsultantApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
  user: { email: string; phone: string | null };
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, same precedent as
// getTenantConsultants (consultants.server.ts).
export async function getTenantConsultantApplications(): Promise<TenantConsultantApplication[]> {
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

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/consultant-applications`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as TenantConsultantApplication[];
}
