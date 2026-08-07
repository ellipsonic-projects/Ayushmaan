"use client";

import Link from "next/link";
import { Activity, Filter } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuditLog } from "@/lib/hooks";

export function AuditLogFeed() {
  const { entries, isLoading } = useAuditLog({ limit: 10 });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>System Events &amp; Audit Log</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href="/superadmin/audit-log">
              <Filter className="h-3.5 w-3.5" />
              View Full Log
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{entry.action}</span> {entry.entityType}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  By {entry.actor?.email ?? entry.actorRole}
                  {entry.tenant ? ` • ${entry.tenant.displayName}` : ""}
                  {entry.reason ? ` • ${entry.reason}` : ""}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
