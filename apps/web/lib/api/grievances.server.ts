import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type GrievanceSubjectType = "BILLING" | "PLATFORM" | "OTHER";
export type GrievanceCategory = "BILLING_DISPUTE" | "DATA_PRIVACY" | "OTHER";
export type GrievanceSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GrievanceStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export interface MyGrievanceEscalation {
  id: string;
  subjectType: GrievanceSubjectType;
  category: GrievanceCategory;
  severity: GrievanceSeverity;
  status: GrievanceStatus;
  description: string;
  createdAt: string;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// before this page renders — same "missing session = no data" rule as
// getTenantConsultant.
export async function getMyGrievanceEscalations(): Promise<MyGrievanceEscalation[]> {
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

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/grievances/mine`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as MyGrievanceEscalation[];
}
