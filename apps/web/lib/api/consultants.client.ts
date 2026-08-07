"use client";

import { authedFetch } from "@/lib/api/authed-fetch";

export async function setConsultantAcceptingClients(consultantId: string, value: boolean) {
  await authedFetch(`/consultants/${consultantId}`, {
    method: "PATCH",
    body: JSON.stringify({ isAcceptingNewClients: value }),
  });
}

// POST /tenants/:tenantId/consultants — invites a Consultant: creates the
// auth user + users(role=CONSULTANT) + consultant_profiles row. Only
// email/fullName/phone/category are accepted here (consultants.router.ts's
// createConsultantSchema is `.strict()`); everything else on the onboarding
// form is filled in via a follow-up updateConsultantProfile PATCH.
export async function createConsultant(input: {
  email: string;
  fullName: string;
  phone: string;
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
    timezone?: string;
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

type CreateSlotInput =
  | { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins?: number }
  | { specificDate: string; startTime: string; endTime: string; slotDurationMins?: number };

export async function createAvailabilitySlot(consultantId: string, input: CreateSlotInput) {
  const { data } = await authedFetch(`/consultants/${consultantId}/availability`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

// GET /tenants/:tenantId/availability-defaults — current recurring weekly
// window, used to hydrate the Settings form instead of hardcoded defaults.
export async function getTenantAvailabilityDefaults(): Promise<
  { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number }[]
> {
  const { data } = await authedFetch(`/availability-defaults`);
  return data;
}

// PUT /tenants/:tenantId/availability-defaults — replaces the tenant's
// recurring weekly window and applies it to every consultant in the tenant
// server-side (backfilling anyone missing it), rather than looping
// createAvailabilitySlot per consultant client-side.
export async function setTenantAvailabilityDefaults(
  windows: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins?: number }[]
) {
  const { data } = await authedFetch(`/availability-defaults`, {
    method: "PUT",
    body: JSON.stringify(windows),
  });
  return data;
}

export async function updateAvailabilitySlot(
  slotId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    status?: "OPEN" | "BOOKED" | "BLOCKED";
    version?: number;
    // Required when a CONSULTANT overrides a slot the tenant admin owns.
    reason?: string;
  }
) {
  const { data } = await authedFetch(`/availability-slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data;
}

export async function deleteAvailabilitySlot(
  slotId: string,
  options: { force?: boolean; reason?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.force) params.set("force", "true");
  if (options.reason) params.set("reason", options.reason);
  const qs = params.toString();
  await authedFetch(`/availability-slots/${slotId}${qs ? `?${qs}` : ""}`, {
    method: "DELETE",
  });
}
