"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Severity = "Critical" | "High" | "Medium";
type Status = "Open" | "Under Review" | "Resolved";
type Role = "Client" | "Consultant";

type Grievance = {
  id: string;
  submitter: string;
  role: Role;
  avatarClass: string;
  subject: string;
  category: string;
  severity: Severity;
  status: Status;
  submittedAt: string;
};

const grievances: Grievance[] = [
  {
    id: "GRV-9021",
    submitter: "Rahul Hegde",
    role: "Client",
    avatarClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    subject: "Dr. Amit Shah (Cons.)",
    category: "Service Quality",
    severity: "Critical",
    status: "Open",
    submittedAt: "24 Oct, 14:30",
  },
  {
    id: "GRV-8842",
    submitter: "Sarah Lawson",
    role: "Consultant",
    avatarClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    subject: "Platform Billing Module",
    category: "Billing",
    severity: "High",
    status: "Under Review",
    submittedAt: "23 Oct, 09:15",
  },
  {
    id: "GRV-8801",
    submitter: "David Kim",
    role: "Client",
    avatarClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    subject: "Telehealth Connectivity",
    category: "Service Quality",
    severity: "Medium",
    status: "Resolved",
    submittedAt: "22 Oct, 18:45",
  },
  {
    id: "GRV-8750",
    submitter: "Mira Sethi",
    role: "Client",
    avatarClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    subject: "Dr. Karan Walia (Cons.)",
    category: "Misconduct",
    severity: "Critical",
    status: "Open",
    submittedAt: "22 Oct, 11:20",
  },
];

const severityClass: Record<Severity, string> = {
  Critical: "text-red-600 dark:text-red-500",
  High: "text-amber-600 dark:text-amber-500",
  Medium: "text-muted-foreground",
};

const severityDot: Record<Severity, string> = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Medium: "bg-slate-400",
};

const statusClass: Record<Status, string> = {
  Open: "border-border bg-muted text-foreground",
  "Under Review":
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Resolved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function GrievancesTable() {
  const [page] = useState(1);

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
              {grievances.map((g) => (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {g.id}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${g.avatarClass}`}
                      >
                        {initials(g.submitter)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {g.submitter}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {g.role}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {g.subject}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">{g.category}</p>
                    <p
                      className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${severityClass[g.severity]}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${severityDot[g.severity]}`}
                      />
                      {g.severity.toUpperCase()}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={statusClass[g.status]}>
                      {g.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {g.submittedAt}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end">
                      {g.status === "Resolved" ? (
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing 1-4 of 24 grievances</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon-sm"
              >
                {n}
              </Button>
            ))}
            <Button variant="outline" size="icon-sm">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
