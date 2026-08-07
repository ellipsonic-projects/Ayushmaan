"use client";

import { platformAuthedFetch } from "./platform-tenant.client";

export async function createPlatformTenantConsultant(
  tenantId: string,
  tenantSlug: string,
  input: { email: string; fullName: string; category: string }
): Promise<{ id: string; consultantProfile: { id: string } }> {
  const { data } = await platformAuthedFetch(tenantId, tenantSlug, "/consultants", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updatePlatformTenantConsultant(
  tenantId: string,
  tenantSlug: string,
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
  await platformAuthedFetch(tenantId, tenantSlug, `/consultants/${consultantId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlatformTenantConsultant(
  tenantId: string,
  tenantSlug: string,
  consultantId: string
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/consultants/${consultantId}`, {
    method: "DELETE",
  });
}

export async function setPlatformUserAccountStatus(
  tenantId: string,
  tenantSlug: string,
  userId: string,
  accountStatus: "ACTIVE" | "SUSPENDED"
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ accountStatus }),
  });
}
