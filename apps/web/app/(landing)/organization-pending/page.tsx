"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";

// Parks a TENANT_ADMIN here while their self-service signup is
// PENDING_APPROVAL, or after a SUPER_ADMIN has REJECTED it — middleware.ts
// redirects any /{slug}/tenant/... request here for those two statuses
// instead of bouncing the session out to /signin, since the account itself
// is valid and should stay signed in.
export default function OrganizationPendingPage() {
  const router = useRouter();
  const { token, loading, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) router.replace("/signin");
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ data: MeResponse }>("/api/auth/me", token)
      .then(({ data }) => {
        if (data.tenant?.status === "ACTIVE") {
          router.replace(destinationFor(data));
        } else {
          setMe(data);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load status"));
  }, [token, router]);

  const checkStatus = async () => {
    if (!token) return;
    setChecking(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: MeResponse }>("/api/auth/me", token);
      if (data.tenant?.status === "ACTIVE") {
        router.replace(destinationFor(data));
      } else {
        setMe(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check status");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/signin");
  };

  if (loading || !token || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tenant = me.tenant;
  const rejected = tenant?.status === "REJECTED";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        {rejected ? (
          <XCircle className="mx-auto h-8 w-8 text-destructive" />
        ) : (
          <Clock3 className="mx-auto h-8 w-8 text-primary" />
        )}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {rejected ? "Signup not approved" : "Awaiting approval"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {rejected
              ? tenant?.rejectionReason
                ? `Your organization signup for "${tenant.displayName}" was not approved. Reason: ${tenant.rejectionReason}`
                : `Your organization signup for "${tenant?.displayName}" was not approved.`
              : `Your organization "${tenant?.displayName}" is awaiting review. We'll notify you once it's approved.`}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!rejected && (
          <Button onClick={checkStatus} disabled={checking} className="w-full">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check again"}
          </Button>
        )}

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
