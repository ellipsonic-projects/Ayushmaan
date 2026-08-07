import { platformTenantFetch } from "./platform-tenant.server";
import type { TenantAppointment, TenantAppointmentsQuery } from "./appointments.server";

export async function getPlatformTenantAppointments(
  tenantId: string,
  tenantSlug: string,
  query: TenantAppointmentsQuery = {}
): Promise<TenantAppointment[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);

  return (
    (await platformTenantFetch<TenantAppointment[]>(
      tenantId,
      tenantSlug,
      `/appointments?${params.toString()}`
    )) ?? []
  );
}

export async function getPlatformTenantAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string
): Promise<TenantAppointment | null> {
  return platformTenantFetch<TenantAppointment>(
    tenantId,
    tenantSlug,
    `/appointments/${appointmentId}`
  );
}
