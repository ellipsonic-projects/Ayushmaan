"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";

// Parks a TENANT_ADMIN here after signup until they confirm their email —
// middleware.ts redirects any /{slug}/tenant/admin/... request back to this
// page while me.emailIsVerified is false, and destinationFor() sends them
// here directly instead of the dashboard right after registration.
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, token, loading, resendSignupEmail, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) router.replace("/signin");
  }, [loading, token, router]);

  const checkVerified = async () => {
    if (!token) return;
    setChecking(true);
    setError(null);
    try {
      const { data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", token);
      if (me.emailIsVerified) {
        router.replace(destinationFor(me));
      } else {
        setError("Still not confirmed — check your inbox and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check verification status");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    setError(null);
    try {
      await resendSignupEmail(user.email);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend confirmation email");
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/signin");
  };

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Confirm your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>. Your workspace is
            ready — confirm your address to open the dashboard.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {resent && !error && (
          <p className="text-sm text-muted-foreground">Confirmation email resent.</p>
        )}

        <div className="space-y-2">
          <Button onClick={checkVerified} disabled={checking} className="w-full">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "I've confirmed — continue"}
          </Button>
          <Button onClick={handleResend} disabled={resending} variant="outline" className="w-full">
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend confirmation email"}
          </Button>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
