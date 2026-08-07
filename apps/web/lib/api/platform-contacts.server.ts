import { platformTenantFetch } from "./platform-tenant.server";
import type { Contact } from "./contacts.server";

export async function getPlatformTenantContacts(
  tenantId: string,
  tenantSlug: string
): Promise<Contact[]> {
  return (await platformTenantFetch<Contact[]>(tenantId, tenantSlug, "/contacts")) ?? [];
}
