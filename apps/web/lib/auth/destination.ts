export type TenantStatus = "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "ARCHIVED";

export interface MeResponse {
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenantId: string | null;
  tenant: {
    slug: string;
    status: TenantStatus;
    displayName: string;
    rejectionReason: string | null;
  } | null;
  /** Always present — the authenticated user's email address. */
  email: string;
  /** Present for CONSULTANT and CLIENT roles only (sourced from their profile row). */
  fullName: string | null;
  /** Present for CONSULTANT only — whether the post-elevation /complete-profile step has run. */
  consultantOnboarding: { consultantId: string; completed: boolean } | null;
  emailIsVerified: boolean;
}

// Where a session lands once its role is known (docs/sprints_v3.md Sprint 1.2
// task 2). Shared between the signin form and the auth callback page so
// role->route mapping lives in exactly one place. TENANT_ADMIN/CONSULTANT
// dashboards live under the tenant's own path (app/(tenant)/[slug]/tenant/...),
// so the slug is embedded directly — everything is same-origin, no
// cross-domain handoff needed. CLIENT and SUPER_ADMIN are platform-level
// (no tenant path to be under) and always resolve directly.
export function destinationFor(me: MeResponse): string {
  // Applies to every role — an unverified email parks the session on
  // /verify-email instead of any dashboard.
  if (!me.emailIsVerified) return "/verify-email";

  switch (me.role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "TENANT_ADMIN":
      if (!me.tenant) return "/";
      if (me.tenant.status === "PENDING_APPROVAL" || me.tenant.status === "REJECTED") {
        return "/organization-pending";
      }
      return `/${me.tenant.slug}/tenant/admin/dashboard`;
    case "CONSULTANT":
      if (!me.tenant) return "/";
      if (me.consultantOnboarding && !me.consultantOnboarding.completed)
        return "/auth/complete-profile";
      return `/${me.tenant.slug}/tenant/consultant/dashboard`;
    case "CLIENT":
      return "/client/dashboard";
    default:
      return "/";
  }
}
