"use client";

import { platformAuthedFetch } from "./platform-tenant.client";

// CLIENT accounts are platform-level (no home tenant_id claim — see
// clients.server.ts's OwnClientProfile), so PATCHing a client's own profile
// still has to go through one specific tenant's route
// (/tenants/:tenantId/clients/:clientId per clients.router.ts). Any tenant
// the client already has a Case with works — patchClientSchema's CLIENT
// branch only checks self-ownership, not tenant membership — so the caller
// passes the tenantId/slug of one of the client's existing cases.
export async function updateOwnClientProfile(
  tenantId: string,
  tenantSlug: string,
  clientId: string,
  updates: {
    fullName?: string;
    dob?: string;
    preferredLanguage?: string;
    timezone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/clients/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// PATCH /tenants/:tenantId/appointments/:appointmentId — a CLIENT's own
// actions: accept/decline a Tenant-Admin-proposed reschedule, or cancel a
// still-open booking (rejected server-side with 409 CANCELLATION_CUTOFF if
// inside tenant_settings.booking_cutoff_hours of the scheduled start).
export async function respondToReschedule(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  accept: boolean
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: accept ? "ADMIN_APPROVED" : "CANCELLED" }),
  });
}

export async function cancelOwnAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string
) {
  await platformAuthedFetch(tenantId, tenantSlug, `/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}
