export interface MeResponse {
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenant: { slug: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"; displayName: string } | null;
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

// Builds a URL on a tenant's subdomain (e.g. http://acme.localhost:3000/tenant/admin/dashboard),
// preserving the current protocol/port so it works the same in dev and prod.
export function tenantOrigin(slug: string, path = "/"): string {
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${slug}.${TENANT_ROOT_HOST}${port}${path}`;
}

// The inverse of tenantOrigin: strips a tenant subdomain back down to the
// main domain (e.g. http://acme.localhost:3000 -> http://localhost:3000).
// Needed anywhere a tenant-scoped session ends (e.g. logout) — router.push
// can't cross origins, so callers must do a full navigation to this URL.
export function rootOrigin(path = "/"): string {
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${TENANT_ROOT_HOST}${port}${path}`;
}

// Crossing from the main domain to a tenant's subdomain is a different
// origin, so the session cookie set here (main domain) isn't sent there —
// browsers reject a `.localhost`/TLD-less Domain-attribute cookie outright,
// so cookie-domain sharing isn't an option in this dev setup. Instead the
// tokens are handed off through the URL fragment (never sent to a server,
// unlike a query string) to app/(tenant)/[slug]/auth/callback/page.tsx,
// which calls supabase.auth.setSession() to establish a fresh, host-only
// session cookie on that subdomain — the same trick auth/callback/page.tsx
// already relies on for magic-link/OTP's implicit-grant redirect.
export function tenantHandoffUrl(
  slug: string,
  session: { accessToken: string; refreshToken: string },
  next: string
): string {
  const target = tenantOrigin(slug, `/auth/callback?next=${encodeURIComponent(next)}`);
  const hash = `access_token=${encodeURIComponent(session.accessToken)}&refresh_token=${encodeURIComponent(session.refreshToken)}`;
  return `${target}#${hash}`;
}
