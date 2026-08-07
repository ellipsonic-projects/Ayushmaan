import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaseDetailData } from "@/lib/api/case-detail.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ReferralStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface ConsultantReferralSummary {
  id: string;
  status: ReferralStatus;
  contextNote: string | null;
  declineReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  fromConsultant: { id: string; fullName: string } | null;
  toConsultant: { id: string; fullName: string } | null;
  client: { id: string; fullName: string } | null;
  sourceCase: { id: string; matterKey: string | null; category: string } | null;
}

export interface ConsultantReferralDetail extends ConsultantReferralSummary {
  case: CaseDetailData;
}

async function resolveAuthedTenant() {
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

  return {
    tenantId: me.tenantId as string,
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
  };
}

// Consultant's own referral inbox (received) or outbox (sent) — the "View"
// entry point for the cross-consultant hand-off flow (sprints.md Sprint 6.1).
export async function getConsultantReferrals(
  box: "incoming" | "outgoing"
): Promise<ConsultantReferralSummary[]> {
  const resolved = await resolveAuthedTenant();
  if (!resolved) return [];

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${resolved.tenantId}/consultant-referrals?box=${box}`,
    { headers: resolved.headers, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ConsultantReferralSummary[];
}

export async function getConsultantReferralDetail(
  referralId: string
): Promise<ConsultantReferralDetail | null> {
  const resolved = await resolveAuthedTenant();
  if (!resolved) return null;

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${resolved.tenantId}/consultant-referrals/${referralId}`,
    { headers: resolved.headers, cache: "no-store" }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return data as ConsultantReferralDetail;
}
