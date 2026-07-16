"use client";

import { platformAuthedFetch } from "./platform-tenant.client";

export async function createPlatformTenantClient(
  tenantId: string,
  tenantSlug: string,
  input: { email: string; fullName: string; phone?: string }
): Promise<{ id: string; clientProfile: { id: string } }> {
  const { data } = await platformAuthedFetch(tenantId, tenantSlug, "/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updatePlatformTenantClient(
  tenantId: string,
  tenantSlug: string,
  clientId: string,
  updates: {
    fullName?: string;
    preferredLanguage?: string;
    timezone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/clients/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlatformTenantClient(
  tenantId: string,
  tenantSlug: string,
  clientId: string
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/clients/${clientId}`, {
    method: "DELETE",
  });
}
