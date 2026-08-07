import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Tenant scoping enforcement (sprints_v3.md Sprint 1.1 task 4): a request
// into `/{slug}/tenant/...` must belong to a signed-in user whose own tenant
// (from apps/api's verified /auth/me, never the URL) matches `slug`, and
// that tenant must be ACTIVE. It must also belong in the specific
// tenant/{admin,consultant}/... section for that user's role — a
// CONSULTANT can't wander into /tenant/admin/..., etc. SUPER_ADMIN is for
// /superadmin/... only, and is rejected from tenant dashboards the same
// way. /superadmin/... itself requires a signed-in SUPER_ADMIN. CLIENT
// accounts are platform-level (no home tenant) — their /client/... section
// just requires a signed-in CLIENT, checked separately below. /signin and
// the public landing pages aren't scoped and don't go through any of this.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface MeResponse {
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenant: {
    slug: string;
    status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "ARCHIVED";
  } | null;
  emailIsVerified: boolean;
}

const ROLE_BY_TENANT_SECTION: Record<string, MeResponse["role"]> = {
  admin: "TENANT_ADMIN",
  consultant: "CONSULTANT",
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({ request });

  const slug = pathname.split("/")[1];
  const isTenantDashboard = pathname.split("/")[2] === "tenant";
  const isSuperAdmin = pathname.startsWith("/superadmin");
  const isClientDashboard = pathname.startsWith("/client");

  if (!isTenantDashboard && !isSuperAdmin && !isClientDashboard) {
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
          response = NextResponse.next({ request });
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

  let meRes: Response;
  try {
    meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // API unreachable (down, network error) — fetch throws rather than
    // resolving with a non-ok response, so this must be caught separately
    // from the !meRes.ok case below.
    return NextResponse.redirect(signInUrl);
  }
  if (!meRes.ok) {
    return NextResponse.redirect(signInUrl);
  }
  const { data: me }: { data: MeResponse } = await meRes.json();

  // Applies to every role — SUPER_ADMIN, TENANT_ADMIN, CONSULTANT, CLIENT —
  // before any role/section-specific routing below.
  if (!me.emailIsVerified) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  if (isSuperAdmin) {
    if (me.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(signInUrl);
    }
    return response;
  }

  if (isClientDashboard) {
    if (me.role !== "CLIENT") {
      return NextResponse.redirect(signInUrl);
    }
    return response;
  }

  // Past this point we're guarding a tenant dashboard — SUPER_ADMIN belongs
  // in /superadmin/... only, CLIENT in /client/... only.
  if (me.role === "SUPER_ADMIN" || me.role === "CLIENT") {
    return NextResponse.redirect(signInUrl);
  }

  if (!me.tenant || me.tenant.slug !== slug) {
    return NextResponse.redirect(signInUrl);
  }

  if (me.tenant.status === "PENDING_APPROVAL" || me.tenant.status === "REJECTED") {
    return NextResponse.redirect(new URL("/organization-pending", request.url));
  }

  if (me.tenant.status !== "ACTIVE") {
    signInUrl.searchParams.set("error", "tenant_" + me.tenant.status.toLowerCase());
    return NextResponse.redirect(signInUrl);
  }

  // Section-level role check: /tenant/{admin,consultant,client}/... must
  // match the signed-in user's own role, not just their tenant.
  const section = pathname.split("/tenant/")[1]?.split("/")[0];
  const requiredRole = section ? ROLE_BY_TENANT_SECTION[section] : undefined;
  if (requiredRole && me.role !== requiredRole) {
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
