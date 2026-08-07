"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { claimCase } from "@/lib/api/case-detail.client";
import type { TenantCase } from "@/lib/api/cases.server";

// Unassigned booking requests in this consultant's own field — a
// TENANT_ADMIN approves the request itself (no manual consultant matching),
// then any consultant serving that field/tenant can "Take" it here.
export function ClaimableCasesQueue({ cases }: { cases: TenantCase[] }) {
  const router = useRouter();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (cases.length === 0) return null;

  async function handleTake(caseId: string) {
    setClaimingId(caseId);
    setError(null);
    try {
      await claimCase(caseId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim this request");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          Available requests
        </CardTitle>
        <Badge variant="secondary">{cases.length}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {cases.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{item.client.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {item.category} · requested{" "}
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
            <Button size="sm" disabled={claimingId === item.id} onClick={() => handleTake(item.id)}>
              Take
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
