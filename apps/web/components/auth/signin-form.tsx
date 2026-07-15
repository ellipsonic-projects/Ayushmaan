"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { destinationFor, tenantHandoffUrl, type MeResponse } from "@/lib/auth/destination";
import type { AuthSession } from "@/lib/auth/types";

type Role = "admin" | "consultant" | "client";
type Method = "password" | "otp";

const roleToBackendRole: Record<Role, MeResponse["role"]> = {
  admin: "TENANT_ADMIN",
  consultant: "CONSULTANT",
  client: "CLIENT",
};

type RoleOption = {
  id: Role;
  title: string;
  description: string;
  icon: typeof Stethoscope;
};

const adminRole: RoleOption = {
  id: "admin",
  title: "Admin",
  description: "Manage consultants and clients oversight.",
  icon: ShieldCheck,
};

const tenantRoles: RoleOption[] = [
  {
    id: "consultant",
    title: "Consultant",
    description: "Manage your clients, sessions, and case notes.",
    icon: Stethoscope,
  },
  {
    id: "client",
    title: "Client",
    description: "Book sessions and track your appointments.",
    icon: UserRound,
  },
];

// The generic platform entry point (no tenantSlug) also fronts Super/Tenant
// Admin sign-in, so it offers all three roles; a tenant's own /signin only
// ever authenticates Consultant/Client for that practice.
const platformRoles: RoleOption[] = [adminRole, ...tenantRoles];

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

// Shared by app/(landing)/signin/page.tsx (tenantSlug absent — the generic
// platform entry point, offering Admin/Consultant/Client) and
// app/(tenant)/[slug]/(public)/signin/page.tsx (tenantSlug set — scoped to
// that practice, offering only Consultant/Client), per docs/sprints_v3.md
// Sprint 1.2 task 2. When tenantSlug is set, a successful login whose
// resolved tenant doesn't match it is rejected — the explicit "detect and
// reject a token whose tenant_id claim doesn't match the subdomain being
// accessed" check, on top of middleware.ts's enforcement for actual
// navigation into /{slug}/tenant/....
export function SignInForm({ tenantSlug }: { tenantSlug?: string }) {
  const router = useRouter();
  const { login, logout } = useAuth();

  const roles = tenantSlug ? tenantRoles : platformRoles;
  const [role, setRole] = useState<Role>(tenantSlug ? "client" : "admin");
  const [method, setMethod] = useState<Method>("password");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeAfterLogin = async (session: AuthSession) => {
    const { data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", session.accessToken);

    if (me.role !== roleToBackendRole[role]) {
      await logout();
      setError(`This account isn't a ${roles.find((r) => r.id === role)?.title}.`);
      return;
    }

    if (tenantSlug && me.tenant?.slug !== tenantSlug) {
      await logout();
      setError(`This account isn't part of ${tenantSlug}.`);
      return;
    }

    // Signing in from the generic platform entry point (no tenantSlug — we're
    // on the main domain), a tenant-scoped user has to cross to their own
    // subdomain; router.push can't navigate across origins, and the session
    // cookie set here isn't sent there either, hence the token handoff.
    if (!tenantSlug && me.tenant) {
      window.location.href = tenantHandoffUrl(me.tenant.slug, session, destinationFor(me));
      return;
    }

    router.push(destinationFor(me));
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(identifier, password);
      await routeAfterLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  // OTP and social sign-in aren't wired to Supabase yet (see data_api_v3.md §4.5/§4.2) —
  // surfaced as "coming soon" rather than granting a session with no real auth behind it.
  const handleSendOtp = (e: FormEvent) => {
    e.preventDefault();
    setError("OTP sign-in is coming soon — use password sign-in for now.");
  };

  const handleVerifyOtp = (e: FormEvent) => {
    e.preventDefault();
    setError("OTP sign-in is coming soon — use password sign-in for now.");
  };

  const handleSocial = (_provider: "google" | "apple") => {
    setError("Social sign-in is coming soon — use password sign-in for now.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — role selection */}
      <div className="relative flex flex-col justify-between bg-primary px-8 py-10 text-white sm:px-12 lg:py-12 dark:bg-slate-900">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="mt-10 max-w-sm text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back to Ayushman
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
            Tell us who you are, then sign in the way that suits you — password, one-time code, or
            your Google / Apple account.
          </p>

          <div className="mt-10 space-y-3">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-white bg-white/10"
                      : "border-white/20 hover:border-white/40 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-white text-primary" : "bg-white/10 text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      {r.title}
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-white/70">{r.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-xs text-white/60">
          © 2026 Ayushman. Built for the consultants your clients trust.
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">SIGNING IN AS</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {roles.find((r) => r.id === role)?.title}
          </h2>

          <Tabs
            value={method}
            onValueChange={(v) => {
              setMethod(v as Method);
              setError(null);
            }}
            className="mt-6"
          >
            <TabsList className="w-full">
              <TabsTrigger value="password" className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Password
              </TabsTrigger>
              <TabsTrigger value="otp" className="gap-1.5">
                <MessageSquareText className="h-3.5 w-3.5" />
                OTP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-5">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="identifier">Email or phone number</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or +91 98765 43210"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/reset-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp" className="mt-5">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp-identifier">Email or phone number</Label>
                    <Input
                      id="otp-identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com or +91 98765 43210"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send one-time code"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      We sent a 6-digit code to{" "}
                      <span className="font-medium text-foreground">{identifier}</span>.
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="otp">One-time code</Label>
                    <Input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="tracking-[0.5em]"
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Use a different email or phone number
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleSocial("google")}
              className="gap-2"
            >
              <GoogleIcon />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleSocial("apple")}
              className="gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground" aria-hidden>
                <path d="M16.365 1.43c0 1.14-.462 2.16-1.213 2.955-.822.87-2.135 1.552-3.318 1.457-.145-1.11.437-2.29 1.174-3.06C13.774.98 15.14.15 16.365 0c.02.145.03.29.03.43ZM20.83 17.02c-.44.99-.65 1.43-1.213 2.31-.79 1.23-1.9 2.76-3.28 2.77-1.22.02-1.54-.79-3.2-.78-1.66.01-2.02.8-3.24.78-1.38-.02-2.44-1.4-3.23-2.63-2.22-3.44-2.45-7.48-.98-10.03.96-1.68 2.61-2.75 4.24-2.75 1.65 0 2.69.83 3.24.83.53 0 1.75-1.02 3.35-.86 3.06.24 4.13 2.9 4.13 2.92-.03.03-2.53 1.47-2.5 4.4.03 3.5 3.06 4.67 3.1 4.68-.02.05-.44 1.5-1.4 3.29Z" />
              </svg>
              Apple
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to Ayushman?{" "}
            <Link
              href={tenantSlug ? "/register" : "/billing"}
              className="font-medium text-primary hover:underline"
            >
              {tenantSlug ? "Create an account" : "Get in touch"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
