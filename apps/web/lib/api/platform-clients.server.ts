import { platformTenantFetch } from "./platform-tenant.server";
import type { TenantClient } from "./clients.server";

export async function getPlatformTenantClients(
  tenantId: string,
  tenantSlug: string
): Promise<TenantClient[]> {
  return (await platformTenantFetch<TenantClient[]>(tenantId, tenantSlug, "/clients")) ?? [];
}

export async function getPlatformTenantClient(
  tenantId: string,
  tenantSlug: string,
  clientId: string
): Promise<TenantClient | null> {
  return platformTenantFetch<TenantClient>(tenantId, tenantSlug, `/clients/${clientId}`);
}
