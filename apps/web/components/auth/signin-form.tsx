"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, Loader2, Mail, MailCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
import { api, ApiError } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";
import type { AuthSession } from "@/lib/auth/types";

type Method = "password" | "otp";

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
  const { login, logout, sendOtp, verifyOtp, signInWithGoogle, resendSignupEmail } = useAuth();

  const [method, setMethod] = useState<Method>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  const routeAfterLogin = async (session: AuthSession) => {
    const { data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", session.accessToken);

    // Clients are platform-level — they have no home tenant to validate
    // against (me.tenant is always null for CLIENT), and any registered
    // client may sign in from any tenant's own sign-in page. Their
    // dashboard lives at a fixed path (no slug), same-origin either way.
    if (me.role === "CLIENT") {
      router.push(destinationFor(me));
      return;
    }

    if (tenantSlug && me.tenant?.slug !== tenantSlug) {
      await logout();
      setError(`This account isn't part of ${tenantSlug}.`);
      return;
    }

    router.push(destinationFor(me));
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(email, password);
      await routeAfterLogin(session);
    } catch (err) {
      // A confirmed-email signup whose `users` row was never created lands
      // here (apps/api's authMiddleware 401s with this exact message) —
      // send it to collect the remaining profile fields instead of showing
      // an error, mirroring app/auth/callback/page.tsx.
      if (
        err instanceof ApiError &&
        err.statusCode === 401 &&
        err.message === "No matching account"
      ) {
        router.push("/auth/complete-profile");
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  // OTP sign-in via email — see lib/auth/supabase-provider.ts.
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send one-time code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await verifyOtp(email, otp);
      await routeAfterLogin(session);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.statusCode === 401 &&
        err.message === "No matching account"
      ) {
        router.push("/auth/complete-profile");
        return;
      }
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async (e: FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendSubmitting(true);
    setResendError(null);
    try {
      await resendSignupEmail(resendEmail);
      setResendSent(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Could not resend confirmation link");
    } finally {
      setResendSubmitting(false);
    }
  };

  const handleSocial = async (_provider: "google") => {
    setError(null);
    try {
      await signInWithGoogle(`${window.location.origin}/auth/callback`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.32] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_76%_16%,rgba(30,64,175,0.22),transparent_34%)]" />

      <div className="flex min-h-screen">
        <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden border-r border-black/10 bg-black px-12 py-14 lg:flex dark:border-white/15">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <Link
            href="/"
            className="relative font-(--font-landing-mono) text-xs tracking-[0.22em] text-white/70 uppercase hover:text-white"
          >
            ← Ayushman
          </Link>

          <div className="relative space-y-8">
            <div className="flex items-center gap-2 font-(--font-landing-mono) text-[0.7rem] tracking-[0.22em] text-[#60a5fa] uppercase">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure access
            </div>
            <h1 className="max-w-sm text-3xl leading-[1.15] font-semibold text-white">
              Continue the timeline where the work left off.
            </h1>
            <ul className="space-y-4">
              {[
                "Private notes stay private.",
                "Client records stay readable and organized.",
                "Consultant access stays fast across mobile and desktop.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative font-(--font-landing-mono) text-[0.65rem] tracking-[0.18em] text-white/50 uppercase">
            Trusted by consultant-led practices
          </p>
        </aside>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-black/68 hover:text-black dark:text-white/68 dark:hover:text-white lg:hidden"
            >
              Back to home
            </Link>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-black dark:text-white">
              Welcome back to Ayushman
            </h1>
            <p className="mt-2 text-sm leading-6 text-black/68 dark:text-white/72">
              Sign in to continue your case timeline.
            </p>

            <Tabs
              value={method}
              onValueChange={(v) => {
                setMethod(v as Method);
                setError(null);
              }}
              className="mt-8"
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-full bg-[#f1f5f9] p-1 dark:bg-[#1e293b]">
                <TabsTrigger
                  value="password"
                  className="gap-1.5 rounded-full text-black/68 data-[state=active]:bg-white data-[state=active]:text-black dark:text-white/68 dark:data-[state=active]:bg-black dark:data-[state=active]:text-white"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Password
                </TabsTrigger>
                <TabsTrigger
                  value="otp"
                  className="gap-1.5 rounded-full text-black/68 data-[state=active]:bg-white data-[state=active]:text-black dark:text-white/68 dark:data-[state=active]:bg-black dark:data-[state=active]:text-white"
                >
                  <Mail className="h-3.5 w-3.5" />
                  OTP
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-black dark:text-white">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-black dark:text-white">
                        Password
                      </Label>
                      <Link
                        href="/reset-password"
                        className="text-xs font-medium text-[#1e40af] hover:underline dark:text-[#60a5fa]"
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
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full rounded-full bg-[#1e40af] text-base text-white shadow-[0_12px_34px_rgba(30,64,175,0.28)] hover:bg-[#1e3a8a] dark:bg-[#60a5fa] dark:text-black dark:hover:bg-[#93c5fd]"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="otp" className="mt-6">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-email" className="text-black dark:text-white">
                        Email
                      </Label>
                      <Input
                        id="otp-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-11 w-full rounded-full bg-[#1e40af] text-base text-white shadow-[0_12px_34px_rgba(30,64,175,0.28)] hover:bg-[#1e3a8a] dark:bg-[#60a5fa] dark:text-black dark:hover:bg-[#93c5fd]"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send one-time code"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="flex items-start gap-2 rounded-2xl border border-black/10 bg-[#f1f5f9] p-4 text-xs text-black/68 dark:border-white/15 dark:bg-[#1e293b] dark:text-white/72">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e40af] dark:text-[#60a5fa]" />
                      <span>
                        We sent a 6-digit code to{" "}
                        <span className="font-medium text-black dark:text-white">{email}</span>.
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp" className="text-black dark:text-white">
                        One-time code
                      </Label>
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

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-11 w-full rounded-full bg-[#1e40af] text-base text-white shadow-[0_12px_34px_rgba(30,64,175,0.28)] hover:bg-[#1e3a8a] dark:bg-[#60a5fa] dark:text-black dark:hover:bg-[#93c5fd]"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify & sign in"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="w-full text-center text-xs font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    >
                      Use a different email
                    </button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4">
              {!resendOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setResendOpen(true);
                    setResendEmail(email);
                    setResendError(null);
                    setResendSent(false);
                  }}
                  className="text-xs font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  Didn&apos;t get a confirmation link? Resend it
                </button>
              ) : (
                <form
                  onSubmit={handleResendConfirmation}
                  className="space-y-3 rounded-2xl border border-black/10 bg-[#f1f5f9] p-4 dark:border-white/15 dark:bg-[#1e293b]"
                >
                  <div className="flex items-start gap-2 text-xs text-black/68 dark:text-white/72">
                    <MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e40af] dark:text-[#60a5fa]" />
                    <span>Enter your email and we&apos;ll resend the confirmation link.</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resend-email" className="text-black dark:text-white">
                      Email
                    </Label>
                    <Input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  {resendError && <p className="text-sm text-destructive">{resendError}</p>}
                  {resendSent && !resendError && (
                    <p className="text-sm text-black/68 dark:text-white/72">
                      Confirmation link resent — check your inbox.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={resendSubmitting}
                      className="h-9 flex-1 rounded-full bg-[#1e40af] text-sm text-white hover:bg-[#1e3a8a] dark:bg-[#60a5fa] dark:text-black dark:hover:bg-[#93c5fd]"
                    >
                      {resendSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Resend link"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setResendOpen(false)}
                      className="px-3 text-xs font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-black/10 dark:border-white/15" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-black/50 dark:bg-black dark:text-white/50">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleSocial("google")}
                className="h-11 gap-2 rounded-full border-black/10 bg-white text-black hover:bg-[#f1f5f9] dark:border-white/15 dark:bg-black dark:text-white dark:hover:bg-[#1e293b]"
              >
                <GoogleIcon />
                Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-black/68 dark:text-white/72">
              Looking to join as a Consultant or Client?{" "}
              <Link
                href={tenantSlug ? `/${tenantSlug}/signup` : "/signup"}
                className="font-medium text-[#1e40af] hover:underline dark:text-[#60a5fa]"
              >
                Sign up here
              </Link>
            </p>

            <p className="mt-8 text-center text-sm text-black/68 dark:text-white/72">
              New to Ayushman?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#1e40af] hover:underline dark:text-[#60a5fa]"
              >
                Register your organization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
