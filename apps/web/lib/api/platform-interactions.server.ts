import { platformTenantFetch } from "./platform-tenant.server";

export interface PlatformInteraction {
  id: string;
  caseId: string;
  type: "SESSION_NOTE" | "AD_HOC_NOTE" | "CALL_LOG" | "MESSAGE_LOG";
  notes: string | null;
  isClientVisible: boolean;
  createdAt: string;
}

export async function getPlatformCaseInteractions(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<PlatformInteraction[]> {
  return (
    (await platformTenantFetch<PlatformInteraction[]>(
      tenantId,
      tenantSlug,
      `/cases/${caseId}/interactions`
    )) ?? []
  );
}
