export interface MeResponse {
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenant: { slug: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" } | null;
}

const TENANT_ROOT_HOST = process.env.NEXT_PUBLIC_TENANT_ROOT_HOST || "localhost";

// Where a session lands once its role is known (docs/sprints_v3.md Sprint 1.2
// task 2). Shared between the signin form and the auth callback page so
// role->route mapping lives in exactly one place. Dashboards now live on the
// tenant's own subdomain (middleware.ts rewrites `{slug}.{root}/tenant/...`
// to `/{slug}/tenant/...` internally), so these paths are relative and only
// resolve correctly when already on that subdomain — a caller on the main
// domain must cross-origin redirect via tenantOrigin() below instead.
export function destinationFor(me: MeResponse): string {
  switch (me.role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "TENANT_ADMIN":
      return me.tenant ? "/tenant/admin/dashboard" : "/";
    case "CONSULTANT":
      return me.tenant ? "/tenant/consultant/dashboard" : "/";
    case "CLIENT":
      return me.tenant ? "/tenant/client/dashboard" : "/";
    default:
      return "/";
  }
}

// Builds the origin for a tenant's subdomain (e.g. http://acme.localhost:3000),
// preserving the current protocol/port so it works the same in dev and prod.
export function tenantOrigin(slug: string): string {
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${slug}.${TENANT_ROOT_HOST}${port}`;
}
