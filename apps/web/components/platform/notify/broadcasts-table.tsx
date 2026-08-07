"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBroadcasts, type BroadcastUrgency, type BroadcastScope } from "@/lib/hooks";

const urgencyClass: Record<BroadcastUrgency, string> = {
  WARNING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  CRITICAL:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  INFO: "border-border bg-muted text-foreground",
};

const scopeLabel: Record<BroadcastScope, string> = {
  GLOBAL: "Global",
  TARGETED_CLIENT: "Targeted",
};

export function BroadcastsTable() {
  const { broadcasts, isLoading } = useBroadcasts();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Recent Broadcasts
          <Badge variant="outline" className="text-[10px]">
            {broadcasts.length} TOTAL
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Broadcast Details</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Urgency</th>
                <th className="py-2 pr-4 font-medium">Recipients</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Radio className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{b.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.sentAt ? new Date(b.sentAt).toLocaleString() : "Not sent"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{scopeLabel[b.scope]}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={urgencyClass[b.urgency]}>
                      {b.urgency}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{b.recipientCount.toLocaleString()}</td>
                </tr>
              ))}
              {!isLoading && broadcasts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No broadcasts sent yet.{" "}
                    <Button variant="link" size="sm" asChild className="h-auto p-0">
                      <Link href="/superadmin/notify/create">Send your first one</Link>
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
