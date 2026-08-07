"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";
import { saveSignupIntent } from "@/lib/auth/signup-intent";
import { markTourAutostartPending } from "@/lib/auth/tour-autostart";

type SignUpMode = "individual" | "organization";

function SectionMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-(--font-landing-mono) text-[0.7rem] tracking-[0.22em] text-[#1e40af] uppercase">
      <span className="h-px w-10 bg-[#1e40af]" />
      {children}
    </div>
  );
}

const individualPromises = [
  "One timeline per client — interactions, commitments, documents, tasks",
  "Reminders and follow-ups that don't rely on anyone's memory",
  "Your practice's records, private by design",
];

const organizationPromises = [
  "Your own workspace, live in minutes",
  "Every client on one timeline — interactions, commitments, documents, tasks",
  "Invite consultants and staff once you're in",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Platform-level signup — apps/web/app/(landing)/signup/page.tsx. A single
// page with two navigable modes rather than two routes:
//   - "individual" (default): Client/Consultant account signup. Distinct
//     from app/(tenant)/[slug]/(public)/register/page.tsx, which carries a
//     tenant_slug so supabase/auth-hooks/handle-new-client-signup.sql
//     provisions the `users` row synchronously. This flow has no tenant
//     slug — that trigger no-ops here — so the `users` + `client_profiles`
//     rows are created explicitly via POST /auth/register-profile right
//     after signup. Consultants sign up through this same base account and
//     apply to a tenant afterward via an invite code
//     (consultant-applications.router.ts), so there's no separate
//     "consultant" mode.
//   - "organization": self-service tenant provisioning, hitting
//     POST /auth/register-tenant instead — see that route for the
//     Tenant + TENANT_ADMIN creation it does in one transaction. Google
//     sign-in is offered here too; since Google never collects practice
//     name/slug, that first-time redirect always lands on
//     app/auth/complete-profile, which asks individual vs organization and
//     collects whichever fields are still missing before calling
//     register-profile or register-tenant itself.
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

export function SignUpForm() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<SignUpMode>("individual");

  // Individual (client/consultant) fields
  const [fullName, setFullName] = useState("");

  // Organization fields
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [address, setAddress] = useState("");
  // Shared fields
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const switchMode = (next: SignUpMode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "individual") {
      if (!fullName || !phone || !email || !password) return;
    } else {
      if (!displayName || !slug || !phone || !email || !password) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const signupMetadata =
        mode === "individual"
          ? { signup_mode: mode }
          : {
              signup_mode: mode,
              org_display_name: displayName,
              org_slug: slug,
              ...(address && { org_address: address }),
            };
      const session = await signUp(email, password, signupMetadata);

      if (!session) {
        saveSignupIntent(
          mode === "individual"
            ? { mode }
            : { mode, displayName, slug, ...(address && { address }) }
        );
        setNeedsConfirmation(true);
        return;
      }

      if (mode === "individual") {
        await api.post("/api/auth/register-profile", { fullName, phone }, session.accessToken);
      } else {
        await api.post(
          "/api/auth/register-tenant",
          { slug, displayName, phone, ...(address && { address }) },
          session.accessToken
        );
      }

      const { data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", session.accessToken);
      markTourAutostartPending();
      router.push(destinationFor(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    saveSignupIntent(
      mode === "individual" ? { mode } : { mode, displayName, slug, ...(address && { address }) }
    );
    try {
      await signInWithGoogle(`${window.location.origin}/auth/callback`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  const promises = mode === "individual" ? individualPromises : organizationPromises;

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
              {mode === "individual" ? (
                <Sparkles className="h-3.5 w-3.5" />
              ) : (
                <Building2 className="h-3.5 w-3.5" />
              )}
              {mode === "individual" ? "Client onboarding" : "Practice onboarding"}
            </div>
            <h1 className="max-w-sm text-3xl leading-[1.15] font-semibold text-white">
              {mode === "individual"
                ? "Every session, every commitment, one timeline."
                : "Bring your practice onto Ayushman."}
            </h1>
            <ul className="space-y-4">
              {promises.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative font-(--font-landing-mono) text-[0.65rem] tracking-[0.18em] text-white/50 uppercase">
            Trusted by independent practices
          </p>
        </aside>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-lg rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-black/68 hover:text-black dark:text-white/68 dark:hover:text-white lg:hidden"
            >
              Back to home
            </Link>

            <div className="mt-4 inline-flex rounded-full border border-black/10 bg-[#f1f5f9] p-1 dark:border-white/15 dark:bg-[#1e293b]">
              <button
                type="button"
                onClick={() => switchMode("individual")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "individual"
                    ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                    : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                }`}
              >
                Client / Consultant
              </button>
              <button
                type="button"
                onClick={() => switchMode("organization")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "organization"
                    ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                    : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                }`}
              >
                Organization
              </button>
            </div>

            <SectionMark>
              {mode === "individual" ? "Create your account" : "Set up your practice"}
            </SectionMark>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-white">
              {mode === "individual" ? "Welcome to Ayushman" : "Create your workspace"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/68 dark:text-white/72">
              {mode === "individual"
                ? "Set up your client or consultant account to get started."
                : "You'll be the admin for your practice's Ayushman workspace."}
            </p>

            {needsConfirmation ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-black/10 bg-[#f1f5f9] p-4 text-sm dark:border-white/15 dark:bg-[#1e293b]">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#1e40af] dark:text-[#60a5fa]" />
                <div className="space-y-1">
                  <p className="font-medium text-black dark:text-white">Check your email</p>
                  <p className="text-black/68 dark:text-white/72">
                    We sent a confirmation link to <span className="font-medium">{email}</span>.
                    Confirm your address, then sign in.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === "individual" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-black dark:text-white">
                      Full name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName" className="text-black dark:text-white">
                        Practice name
                      </Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                        placeholder="Apollo Heart Centre"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-black dark:text-white">
                        Address (optional)
                      </Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 MG Road, Bengaluru, India"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-black dark:text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-black dark:text-white">
                    Phone number
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(value) => setPhone(value ?? "")}
                    placeholder="98765 43210"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-black dark:text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-full bg-[#1e40af] text-base text-white shadow-[0_12px_34px_rgba(30,64,175,0.28)] hover:bg-[#1e3a8a] dark:bg-[#60a5fa] dark:text-black dark:hover:bg-[#93c5fd]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "individual" ? (
                    "Create account"
                  ) : (
                    "Create workspace"
                  )}
                </Button>

                <p className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#1e40af] dark:text-[#60a5fa]" />
                  {mode === "individual"
                    ? "Your records stay private to you and your consultant."
                    : "Your practice's records stay private to your workspace."}
                </p>
              </form>
            )}

            {!needsConfirmation && (
              <>
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

                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={handleGoogleSignup}
                  className="h-11 w-full gap-2 rounded-full border-black/10 bg-white text-black hover:bg-[#f1f5f9] dark:border-white/15 dark:bg-black dark:text-white dark:hover:bg-[#1e293b]"
                >
                  <GoogleIcon />
                  Google
                </Button>
              </>
            )}

            <p className="mt-8 text-center text-sm text-black/68 dark:text-white/72">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-medium text-[#1e40af] hover:underline dark:text-[#60a5fa]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
