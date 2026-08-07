"use client";

import { authedFetchForTenant } from "@/lib/api/authed-fetch";
import type { SharedTemplateItem } from "@/lib/api/shared-templates.server";

// Consultant-only write path (shared-templates.router.ts's POST is
// requireRole("CONSULTANT")) — used by the consultant documentation page's
// "Share template" dialog. Mirrors client-documents.client.ts's
// per-case authedFetch shape.
export async function shareTemplateWithCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  input: { workflowTemplateId: string } | { formTemplateId: string }
): Promise<SharedTemplateItem> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/shared-templates`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return data;
}
