"use client";

import { authedFetchForTenant } from "@/lib/api/authed-fetch";
import type { ClientCaseTask } from "@/lib/api/client-tasks.server";

// CLIENT accounts are platform-level (no home tenant_id claim), so every
// call here takes the tenantId/tenantSlug of the specific case being acted
// on, mirroring client-documents.client.ts.

// Clients may only set status: COMPLETED on a task assigned to them
// (enforced server-side in tasks.router.ts). responseText is required for a
// WRITE_RESPONSE task and rejected for any other type — UPLOAD_DOCUMENT and
// FILL_FORM tasks complete themselves via createClientDocument / the form
// submit flow instead of this endpoint.
export async function completeClientTask(
  tenantId: string,
  tenantSlug: string,
  taskId: string,
  responseText?: string
): Promise<ClientCaseTask> {
  const { data } = await authedFetchForTenant(tenantId, tenantSlug, `/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "COMPLETED", ...(responseText && { responseText }) }),
  });
  return data;
}
