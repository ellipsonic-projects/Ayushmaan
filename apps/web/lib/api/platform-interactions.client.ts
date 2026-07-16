"use client";

import { platformAuthedFetch } from "./platform-tenant.client";

export async function createPlatformCaseInteraction(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  input: {
    type: "SESSION_NOTE" | "AD_HOC_NOTE" | "CALL_LOG" | "MESSAGE_LOG";
    notes: string;
    isClientVisible?: boolean;
  }
) {
  const { data } = await platformAuthedFetch(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/interactions`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return data;
}

export async function updatePlatformCaseInteraction(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  interactionId: string,
  updates: { notes?: string; isClientVisible?: boolean }
) {
  await platformAuthedFetch(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/interactions/${interactionId}`,
    { method: "PATCH", body: JSON.stringify(updates) }
  );
}

export async function deletePlatformCaseInteraction(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  interactionId: string
) {
  await platformAuthedFetch(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/interactions/${interactionId}`,
    { method: "DELETE" }
  );
}
