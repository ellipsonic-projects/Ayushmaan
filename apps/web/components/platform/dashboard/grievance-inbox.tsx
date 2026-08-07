"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformDashboardStats, useRecentGrievances } from "@/lib/hooks";
import { severityBadgeClass } from "@/lib/severity";

const categoryLabel: Record<string, string> = {
  SERVICE_QUALITY: "Service Quality",
  MISCONDUCT: "Misconduct",
  BILLING_DISPUTE: "Billing",
  DATA_PRIVACY: "Data Privacy",
  OTHER: "Other",
};

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function GrievanceInbox() {
  const { grievances, isLoading, error } = useRecentGrievances(3);
  const { stats } = usePlatformDashboardStats();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Grievance Inbox</CardTitle>
        <CardAction>
          <Badge variant="destructive">{stats?.openGrievances ?? 0} OPEN</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {error ? (
          <p className="text-sm text-destructive">Failed to load grievances.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading grievances…</p>
        ) : grievances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open grievances.</p>
        ) : (
          grievances.map((item) => (
            <div
              key={item.id}
              className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={severityBadgeClass[item.severity]}>
                  {item.severity}
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {item.tenant?.displayName ?? "Unknown tenant"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <Badge variant="outline">{categoryLabel[item.category] ?? item.category}</Badge>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="justify-center bg-transparent p-4 pt-0">
        <Button variant="secondary" className="w-full">
          View All Grievances
        </Button>
      </CardFooter>
    </Card>
  );
}
