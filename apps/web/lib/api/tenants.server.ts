import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface TenantDetail {
  id: string;
  slug: string;
  customDomain: string | null;
  displayName: string;
  logoUrl: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  planTier: string;
  createdAt: string;
  settings: {
    defaultCurrency: string;
    payoutCycle: "WEEKLY" | "MONTHLY" | "QUARTERLY";
    bookingCutoffHours: number;
    autoApproveBookings: boolean;
  } | null;
  billing: {
    planName: string;
    status: string;
  } | null;
  users: {
    id: string;
    role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
    email: string;
    accountStatus: string;
  }[];
}

// middleware.ts guarantees the caller is a signed-in SUPER_ADMIN before this
// page renders. GET /platform/tenants/:tenantId is a cross-tenant read and is
// audit-logged server-side, so it requires a `reason` — this is a page view,
// not an explicit user-initiated action, so a fixed reason is supplied.
export async function getPlatformTenantDetail(tenantId: string): Promise<TenantDetail | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const reason = encodeURIComponent("Super Admin console: tenant detail page view");
  const res = await fetch(`${API_BASE_URL}/api/platform/tenants/${tenantId}?reason=${reason}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const { data } = await res.json();
  return data as TenantDetail;
}
