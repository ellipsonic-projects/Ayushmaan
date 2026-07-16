"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Status = "New" | "In Progress" | "Resolved";

const STATUS_OPTIONS: {
  value: Status;
  icon: typeof AlertCircle;
  active: string;
}[] = [
  {
    value: "New",
    icon: AlertCircle,
    active: "border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  {
    value: "In Progress",
    icon: Clock,
    active:
      "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    value: "Resolved",
    icon: CheckCircle2,
    active:
      "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  },
];

const statusBadgeClass: Record<Status, string> = {
  New: "border-border bg-muted text-foreground",
  "In Progress":
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Resolved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

const grievance = {
  id: "GRV-9021",
  submitter: "Rahul Hegde",
  role: "Client",
  avatarClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  tenant: "Sunrise Wellness Clinic",
  subject: "Dr. Amit Shah (Cons.)",
  category: "Service Quality",
  severity: "Critical" as const,
  submittedAt: "24 Oct, 14:30",
  description:
    "Client reports repeated missed session reminders and unresponsive consultant communication over the past two weeks, resulting in a missed appointment and delayed care plan follow-up.",
  activity: [
    {
      actor: "System",
      note: "Grievance submitted via client portal.",
      at: "24 Oct, 14:30",
    },
    {
      actor: "Platform Team",
      note: "Escalated to tenant admin for review.",
      at: "24 Oct, 15:05",
    },
  ],
};

const severityClass: Record<string, string> = {
  Critical: "text-red-600 dark:text-red-500",
  High: "text-amber-600 dark:text-amber-500",
  Medium: "text-muted-foreground",
};

const severityDot: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Medium: "bg-slate-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function GrievanceDetailPage() {
  const [status, setStatus] = useState<Status>("New");
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href="/superadmin/grievances">
          <ChevronLeft className="h-4 w-4" />
          Back to grievances
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              grievance.avatarClass
            )}
          >
            {initials(grievance.submitter)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{grievance.id}</h1>
              <Badge variant="outline" className={statusBadgeClass[status]}>
                {status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-foreground">
              {grievance.submitter}{" "}
              <span className="text-muted-foreground">
                ({grievance.role}) &middot; {grievance.tenant}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
            <CalendarClock className="h-3.5 w-3.5" />
            Submitted {grievance.submittedAt}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Grievance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Subject / Target</p>
                  <p className="text-sm font-medium text-foreground">{grievance.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">{grievance.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <p
                    className={cn(
                      "mt-0.5 flex items-center gap-1.5 text-xs font-medium",
                      severityClass[grievance.severity]
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", severityDot[grievance.severity])}
                    />
                    {grievance.severity.toUpperCase()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 text-sm text-foreground">{grievance.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {grievance.activity.map((entry, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {idx < grievance.activity.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-1">
                      <p className="text-foreground">
                        <span className="font-medium">{entry.actor}</span> {entry.note}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.at}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                <Label htmlFor="note">Add a note</Label>
                <Textarea
                  id="note"
                  placeholder="Add context or a resolution note..."
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={note.trim().length === 0}
                    onClick={() => setNote("")}
                  >
                    Post Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-80">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      status === opt.value
                        ? opt.active
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.value}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
