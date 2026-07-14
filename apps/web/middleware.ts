import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Two jobs, in order:
//
// 1. Subdomain routing: a request to `{slug}.{TENANT_ROOT_HOST}/foo` is
//    rewritten internally to `/{slug}/foo` so it resolves against the
//    app/(tenant)/[slug]/... file structure, without the slug showing up
//    in the URL the tenant sees. Mirrors apps/api's
//    lib/tenant/resolveTenantSlug.ts, which does the same host-suffix
//    stripping for API requests.
//
// 2. Tenant scoping enforcement (sprints_v3.md Sprint 1.1 task 4): a
//    request into tenant/... (either `/{slug}/tenant/...` reached via a
//    direct path, or `{slug}.{TENANT_ROOT_HOST}/tenant/...` reached via
//    subdomain) must belong to a signed-in user whose own tenant (from
//    apps/api's verified /auth/me, never the URL/host) matches `slug`, and
//    that tenant must be ACTIVE. /superadmin, /signin and the public
//    landing pages aren't tenant-scoped and don't go through this.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const TENANT_ROOT_HOST = process.env.NEXT_PUBLIC_TENANT_ROOT_HOST || "localhost";

interface MeResponse {
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenant: { slug: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" } | null;
}

function tenantSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0];
  const suffix = `.${TENANT_ROOT_HOST}`;
  if (hostname === TENANT_ROOT_HOST || !hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return slug.length > 0 ? slug : null;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const subdomainSlug = tenantSlugFromHost(host);
  const pathname = request.nextUrl.pathname;

  const rewrittenUrl = subdomainSlug
    ? new URL(`/${subdomainSlug}${pathname}${request.nextUrl.search}`, request.url)
    : null;

  let response = rewrittenUrl
    ? NextResponse.rewrite(rewrittenUrl, { request })
    : NextResponse.next({ request });

  const slug = subdomainSlug ?? pathname.split("/")[1];
  const isTenantDashboard = subdomainSlug
    ? pathname.startsWith("/tenant/")
    : pathname.split("/")[2] === "tenant";

  if (!isTenantDashboard) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = rewrittenUrl
            ? NextResponse.rewrite(rewrittenUrl, { request })
            : NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const signInUrl = new URL("/signin", request.url);

  if (!session) {
    return NextResponse.redirect(signInUrl);
  }

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!meRes.ok) {
    return NextResponse.redirect(signInUrl);
  }
  const { data: me }: { data: MeResponse } = await meRes.json();

  if (me.role === "SUPER_ADMIN") {
    return response;
  }

  if (!me.tenant || me.tenant.slug !== slug) {
    return NextResponse.redirect(signInUrl);
  }

  if (me.tenant.status !== "ACTIVE") {
    signInUrl.searchParams.set("error", "tenant_" + me.tenant.status.toLowerCase());
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
