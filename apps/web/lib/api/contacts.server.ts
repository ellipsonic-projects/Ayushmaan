import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ContactType = "REFERRAL_PARTNER" | "VENDOR" | "OTHER";

export interface Contact {
  id: string;
  tenantId: string;
  fullName: string;
  type: ContactType;
  organization: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantContacts(): Promise<Contact[]> {
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

  const contactsRes = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/contacts`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!contactsRes.ok) return [];
  const { data } = await contactsRes.json();
  return data as Contact[];
}
