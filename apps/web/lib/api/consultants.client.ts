"use client";

import { supabase } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authedFetch(path: string, init: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      "X-Tenant-Slug": me.tenant.slug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface ConsultantListItem {
  id: string;
  fullName: string;
  category: string;
  isAcceptingNewClients: boolean;
}

// GET /tenants/:tenantId/consultants — used by the pending-approvals queue
// to let a TENANT_ADMIN pick who to assign a consultant-less case-request to.
export async function listConsultants(): Promise<ConsultantListItem[]> {
  const { data } = await authedFetch(`/consultants`, { method: "GET" });
  return data;
}

export async function setConsultantAcceptingClients(consultantId: string, value: boolean) {
  await authedFetch(`/consultants/${consultantId}`, {
    method: "PATCH",
    body: JSON.stringify({ isAcceptingNewClients: value }),
  });
}

// POST /tenants/:tenantId/consultants — invites a Consultant: creates the
// auth user + users(role=CONSULTANT) + consultant_profiles row. Only
// email/fullName/category are accepted here (consultants.router.ts's
// createConsultantSchema is `.strict()`); everything else on the onboarding
// form is filled in via a follow-up updateConsultantProfile PATCH.
export async function createConsultant(input: {
  email: string;
  fullName: string;
  category: string;
}): Promise<{ id: string; consultantProfile: { id: string } }> {
  const { data } = await authedFetch(`/consultants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateUserPhone(userId: string, phone: string) {
  await authedFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ phone }),
  });
}

export async function setUserAccountStatus(userId: string, accountStatus: "ACTIVE" | "SUSPENDED") {
  await authedFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ accountStatus }),
  });
}

export async function updateConsultantProfile(
  consultantId: string,
  updates: {
    fullName?: string;
    category?: string;
    subSpecialization?: string;
    bio?: string;
    consultationFee?: number;
    currency?: string;
    languagesSpoken?: string[];
    isAcceptingNewClients?: boolean;
    autoApproveBookings?: boolean;
    paymentTiming?: "PAY_ON_BOOKING" | "PAY_AFTER_SESSION";
  }
) {
  await authedFetch(`/consultants/${consultantId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteVerificationDocument(docId: string) {
  await authedFetch(`/verification-documents/${docId}`, { method: "DELETE" });
}

export async function createOutOfOffice(
  consultantId: string,
  input: {
    startDate: string;
    endDate: string;
    autoReplyMessage?: string;
    pausesNewBookings?: boolean;
  }
) {
  const { data } = await authedFetch(`/consultants/${consultantId}/out-of-office`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateOutOfOffice(
  oooId: string,
  updates: {
    startDate?: string;
    endDate?: string;
    autoReplyMessage?: string;
    pausesNewBookings?: boolean;
  }
) {
  await authedFetch(`/out-of-office/${oooId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteOutOfOffice(oooId: string) {
  await authedFetch(`/out-of-office/${oooId}`, { method: "DELETE" });
}
