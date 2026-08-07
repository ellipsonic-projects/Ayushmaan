import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface NotificationPreferenceRow {
  type: string;
  channel: string;
  enabled: boolean;
  leadTimeMins: number | null;
}

// notification_preferences carries no tenant_id column — the :tenantId path
// segment exists only to match the app's tenant-scoped URL convention
// (docs/api-patterns.md §21), so any tenant the caller belongs to works.
export async function getNotificationPreferences(
  tenantId: string,
  tenantSlug: string
): Promise<NotificationPreferenceRow[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/notification-preferences`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Tenant-Slug": tenantSlug,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as NotificationPreferenceRow[];
}

// Resolves the caller's own home tenant via /auth/me — for TENANT_ADMIN/CONSULTANT
// pages that always operate within a single home tenant (mirrors commitments.server.ts).
export async function getOwnNotificationPreferences(): Promise<{
  tenantId: string;
  tenantSlug: string;
  preferences: NotificationPreferenceRow[];
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return null;
  const { data: me } = await meRes.json();
  if (!me?.tenantId || !me.tenant?.slug) return null;

  const preferences = await getNotificationPreferences(me.tenantId, me.tenant.slug);
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, preferences };
}
