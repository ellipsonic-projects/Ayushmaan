"use client";

import { useRef, useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import {
  useTenantCustomLayoutStatus,
  uploadTenantCustomLayout,
  removeTenantCustomLayout,
} from "@/lib/hooks";

// Super-admin-only: uploads a fully custom, hand-built HTML landing page for
// a tenant (replaces the default component-based public page) — see
// apps/api/src/routes/tenants.router.ts POST/DELETE .../custom-layout.
export function TenantCustomLayoutCard({ tenantId }: { tenantId: string | null }) {
  const { token } = useAuth();
  const { status, isLoading, mutate } = useTenantCustomLayoutStatus(tenantId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (!tenantId || !token) return;
    setBusy(true);
    setError(null);
    try {
      await uploadTenantCustomLayout(tenantId, file, token);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload custom layout");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!tenantId || !token) return;
    setBusy(true);
    setError(null);
    try {
      await removeTenantCustomLayout(tenantId, token);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove custom layout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <LayoutTemplate className="h-3.5 w-3.5" />
          Custom Layout
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading || !status ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {status.customLayoutRequested && status.layoutMode === "default" && (
              <p className="text-sm text-foreground">Tenant has requested a custom layout.</p>
            )}
            <p className="text-sm text-muted-foreground">
              {status.layoutMode === "custom"
                ? "A custom HTML layout is currently live for this tenant."
                : "This tenant is using the default component-based landing page."}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="text/html,.html"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !tenantId}
                onClick={() => fileInputRef.current?.click()}
              >
                {status.layoutMode === "custom" ? "Replace layout" : "Upload layout"}
              </Button>
              {status.layoutMode === "custom" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              A single HTML file (max 500KB). Replaces the default landing page for this tenant.
            </p>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
