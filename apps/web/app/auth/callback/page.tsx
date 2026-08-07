"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authProvider } from "@/lib/auth";
import { api, ApiError } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";
import type { AuthSession } from "@/lib/auth/types";

// The identity provider redirects magic-link / OTP verification here
// (configure this as a Redirect URL in the provider's auth settings). The
// provider's client parses the session out of the URL automatically on
// load, then we resolve role and route — routed through the AuthProvider
// abstraction (lib/auth) rather than a provider SDK directly.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    const routeSession = async (session: AuthSession) => {
      if (settled.current) return;
      settled.current = true;
      try {
        const { data } = await api.get<{ data: MeResponse }>("/api/auth/me", session.accessToken);
        router.replace(destinationFor(data));
      } catch (err) {
        // A Google sign-in that has no `users` row yet lands here (apps/api's
        // authMiddleware 401s with this exact message) — send it to collect
        // the remaining profile fields instead of showing an error. Signed
        // out again would be wrong: they're mid identity-provider redirect.
        if (
          err instanceof ApiError &&
          err.statusCode === 401 &&
          err.message === "No matching account"
        ) {
          router.replace("/auth/complete-profile");
          return;
        }
        setError(err instanceof Error ? err.message : "Could not verify your account");
      }
    };

    authProvider.getSession().then((session) => {
      if (session) routeSession(session);
    });

    const unsubscribe = authProvider.onAuthStateChange((session) => {
      if (session) routeSession(session);
    });

    return unsubscribe;
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Link href="/signin" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying your account…</p>
        </>
      )}
    </div>
  );
}
