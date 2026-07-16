"use client";

import { platformAuthedFetch } from "./platform-tenant.client";

export async function createPlatformTenantCase(
  tenantId: string,
  tenantSlug: string,
  input: {
    clientId: string;
    category: string;
    matterKey?: string;
    requirements?: string;
    consultantId: string;
  }
) {
  const { data } = await platformAuthedFetch(tenantId, tenantSlug, "/cases", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updatePlatformTenantCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  updates: { requirements: string }
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlatformTenantCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/cases/${caseId}`, {
    method: "DELETE",
  });
}
