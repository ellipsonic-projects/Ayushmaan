"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// Lands here after signin-form.tsx / the main-domain auth callback hands off
// a session to this subdomain via lib/auth/destination.ts's tenantHandoffUrl
// — tokens in the URL fragment, destination in `next`. setSession() writes
// a fresh, host-only cookie for THIS origin (see tenantHandoffUrl's comment
// for why cross-domain cookie sharing isn't used instead).
export default function TenantAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const next = new URLSearchParams(window.location.search).get("next") || "/";

    if (!accessToken || !refreshToken) {
      setError("Missing session tokens");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        router.replace(next);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-medium text-destructive">{error}</p>
          <a href="/tenant/auth" className="text-sm text-primary hover:underline">
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
