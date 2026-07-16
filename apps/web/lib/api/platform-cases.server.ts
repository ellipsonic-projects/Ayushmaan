import { platformTenantFetch } from "./platform-tenant.server";
import type { TenantCase } from "./cases.server";

export async function getPlatformTenantCases(
  tenantId: string,
  tenantSlug: string
): Promise<TenantCase[]> {
  return (await platformTenantFetch<TenantCase[]>(tenantId, tenantSlug, "/cases")) ?? [];
}

export interface PlatformCaseDetail extends TenantCase {
  client: { fullName: string; user: { email: string; phone: string | null } };
  consultant: { id: string; fullName: string };
  requirements: string | null;
  appointments: unknown[];
  interactions: {
    id: string;
    type: string;
    notes: string | null;
    isClientVisible: boolean;
    createdAt: string;
  }[];
  commitments: unknown[];
  tasks: unknown[];
  documents: unknown[];
}

export async function getPlatformTenantCase(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<PlatformCaseDetail | null> {
  return platformTenantFetch<PlatformCaseDetail>(tenantId, tenantSlug, `/cases/${caseId}`);
}
