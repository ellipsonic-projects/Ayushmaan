"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authProvider } from "@/lib/auth";
import { api } from "@/lib/api/client";
import { destinationFor, tenantOrigin, type MeResponse } from "@/lib/auth/destination";

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
    const routeSession = async (accessToken: string) => {
      if (settled.current) return;
      settled.current = true;
      try {
        const { data } = await api.get<{ data: MeResponse }>("/api/auth/me", accessToken);
        // This callback only exists on the main domain — a tenant-scoped user
        // has to cross to their own subdomain, same as signin-form.tsx.
        if (data.tenant) {
          window.location.href = tenantOrigin(data.tenant.slug);
          return;
        }
        router.replace(destinationFor(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not verify your account");
      }
    };

    authProvider.getSession().then((session) => {
      if (session) routeSession(session.accessToken);
    });

    const unsubscribe = authProvider.onAuthStateChange((session) => {
      if (session) routeSession(session.accessToken);
    });

    return unsubscribe;
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-medium text-destructive">{error}</p>
          <a href="/signin" className="text-sm text-primary hover:underline">
            Back to sign in
          </a>
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
