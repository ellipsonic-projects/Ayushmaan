import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Shared read helper for SUPER_ADMIN pages viewing an arbitrary tenant's
// workspace. Unlike the "self" helpers in consultants.server.ts etc. (which
// resolve tenantId/slug from the caller's own /api/auth/me), a SUPER_ADMIN
// has no tenantId of their own — tenantId/tenantSlug are passed in explicitly
// (the slug comes from getPlatformTenantDetail) so tenantContextMiddleware
// resolves a real tenant context instead of the cross-tenant RLS bypass.
export async function platformTenantFetch<T>(
  tenantId: string,
  tenantSlug: string,
  path: string
): Promise<T | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}${path}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Tenant-Slug": tenantSlug,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const { data } = await res.json();
  return data as T;
}
