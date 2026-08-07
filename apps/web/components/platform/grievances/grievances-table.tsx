"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformGrievance } from "@/lib/hooks";
import { severityDotClass, severityTextClass } from "@/lib/severity";

const categoryLabel: Record<string, string> = {
  SERVICE_QUALITY: "Service Quality",
  MISCONDUCT: "Misconduct",
  BILLING_DISPUTE: "Billing Dispute",
  DATA_PRIVACY: "Data Privacy",
  OTHER: "Other",
};

const statusLabel: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

const statusClass: Record<string, string> = {
  OPEN: "border-border bg-muted text-foreground",
  UNDER_REVIEW:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  RESOLVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  DISMISSED: "border-border bg-muted text-muted-foreground",
};

const avatarPalette = [
  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function subjectLabel(g: PlatformGrievance) {
  if (g.subjectType === "CONSULTANT") return g.subjectConsultant?.fullName ?? "Consultant";
  if (g.subjectType === "TENANT_ADMIN") return "Tenant Admin";
  if (g.subjectType === "BILLING") return "Billing";
  if (g.subjectType === "PLATFORM") return "Platform";
  return "Other";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GrievancesTable({
  grievances,
  isLoading,
  error,
}: {
  grievances: PlatformGrievance[];
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Grievance ID</th>
                <th className="py-2 pr-4 font-medium">Submitter</th>
                <th className="py-2 pr-4 font-medium">Subject / Target</th>
                <th className="py-2 pr-4 font-medium">Category &amp; Severity</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Submitted At</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading grievances…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-destructive">
                    Failed to load grievances.
                  </td>
                </tr>
              ) : grievances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No grievances match these filters.
                  </td>
                </tr>
              ) : (
                grievances.map((g, idx) => {
                  const submitter = g.client?.fullName ?? "Unknown Client";
                  return (
                    <tr key={g.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {g.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                          >
                            {initials(submitter)}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{submitter}</p>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {g.tenant?.displayName ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{subjectLabel(g)}</td>
                      <td className="py-3 pr-4">
                        <p className="text-foreground">{categoryLabel[g.category] ?? g.category}</p>
                        <p
                          className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${severityTextClass[g.severity]}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${severityDotClass[g.severity]}`}
                          />
                          {g.severity}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={statusClass[g.status]}>
                          {statusLabel[g.status]?.toUpperCase() ?? g.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatTimestamp(g.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end">
                          {g.status === "RESOLVED" || g.status === "DISMISSED" ? (
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" asChild>
                              <Link href="/superadmin/grievances/id">Review</Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !error && grievances.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {grievances.length} grievances</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
