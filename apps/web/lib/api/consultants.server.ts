import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ConsultantProfile {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  category: string;
  subSpecialization: string | null;
  bio: string | null;
  consultationFee: string;
  currency: string;
  languagesSpoken: string[];
  ratingAvg: string;
  ratingCount: number;
  isAcceptingNewClients: boolean;
  autoApproveBookings: boolean;
  paymentTiming: "PAY_ON_BOOKING" | "PAY_AFTER_SESSION";
  user: { email: string; accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED" };
  _count: { cases: number };
  outOfOfficePeriods: { id: string }[];
}

// Resolves "my own consultant profile" for the signed-in CONSULTANT. There's
// no dedicated /consultants/me route — this reuses the existing
// CONSULTANT-readable list route and matches on email, same as /auth/me
// already does to resolve tenant identity.
export async function getOwnConsultantProfile(): Promise<ConsultantProfile | null> {
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

  const consultantsRes = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/consultants`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!consultantsRes.ok) return null;
  const { data } = await consultantsRes.json();
  const consultants = data as ConsultantProfile[];
  return consultants.find((c) => c.user.email === me.email) ?? null;
}

export interface ConsultantVerificationDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  issuingAuthority: string | null;
  expiryDate: string | null;
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantConsultants(): Promise<ConsultantProfile[]> {
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

  const consultantsRes = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/consultants`, {
    headers: tenantHeaders,
  });
  if (!consultantsRes.ok) return [];
  const { data } = await consultantsRes.json();
  return data as ConsultantProfile[];
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantConsultant(consultantId: string): Promise<ConsultantProfile | null> {
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
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return data as ConsultantProfile;
}

export interface ConsultantOutOfOfficePeriod {
  id: string;
  startDate: string;
  endDate: string;
  autoReplyMessage: string | null;
  pausesNewBookings: boolean;
}

export async function getConsultantOutOfOffice(
  consultantId: string
): Promise<ConsultantOutOfOfficePeriod[]> {
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}/out-of-office`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ConsultantOutOfOfficePeriod[];
}

export interface ConsultantAvailabilitySlot {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
}

export async function getTenantConsultantAvailability(
  consultantId: string
): Promise<ConsultantAvailabilitySlot[]> {
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}/availability`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ConsultantAvailabilitySlot[];
}

export async function getConsultantVerificationDocuments(
  consultantId: string
): Promise<ConsultantVerificationDocument[]> {
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/consultants/${consultantId}/verification-documents`,
    { headers: tenantHeaders, cache: "no-store" }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ConsultantVerificationDocument[];
}
