import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface TenantAuditLogEntry {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorRole: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  isCrossTenantAccess: boolean;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; email: string; consultantProfile: { fullName: string } | null } | null;
  case: { id: string; matterKey: string | null; category: string } | null;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantAuditLog(): Promise<TenantAuditLogEntry[]> {
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

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/audit-log`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as TenantAuditLogEntry[];
}
