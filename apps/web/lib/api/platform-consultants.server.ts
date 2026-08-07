import { platformTenantFetch } from "./platform-tenant.server";
import type {
  ConsultantProfile,
  ConsultantVerificationDocument,
  ConsultantAvailabilitySlot,
} from "./consultants.server";

export async function getPlatformTenantConsultants(
  tenantId: string,
  tenantSlug: string
): Promise<ConsultantProfile[]> {
  return (
    (await platformTenantFetch<ConsultantProfile[]>(tenantId, tenantSlug, "/consultants")) ?? []
  );
}

export async function getPlatformTenantConsultant(
  tenantId: string,
  tenantSlug: string,
  consultantId: string
): Promise<ConsultantProfile | null> {
  return platformTenantFetch<ConsultantProfile>(
    tenantId,
    tenantSlug,
    `/consultants/${consultantId}`
  );
}

export async function getPlatformTenantConsultantAvailability(
  tenantId: string,
  tenantSlug: string,
  consultantId: string
): Promise<ConsultantAvailabilitySlot[]> {
  return (
    (await platformTenantFetch<ConsultantAvailabilitySlot[]>(
      tenantId,
      tenantSlug,
      `/consultants/${consultantId}/availability`
    )) ?? []
  );
}

export async function getPlatformConsultantVerificationDocuments(
  tenantId: string,
  tenantSlug: string,
  consultantId: string
): Promise<ConsultantVerificationDocument[]> {
  return (
    (await platformTenantFetch<ConsultantVerificationDocument[]>(
      tenantId,
      tenantSlug,
      `/consultants/${consultantId}/verification-documents`
    )) ?? []
  );
}
