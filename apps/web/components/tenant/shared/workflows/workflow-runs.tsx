"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, RotateCcw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WorkflowRun, WorkflowRunStatus } from "@/lib/api/workflow-runs.server";
import { retryWorkflowRun } from "@/lib/api/workflow-runs.client";

const STATUS_BADGE: Record<WorkflowRunStatus, string> = {
  RUNNING: "border-sky-500 text-sky-600",
  WAITING: "border-amber-500 text-amber-600",
  COMPLETED: "bg-emerald-600 text-white hover:bg-emerald-600",
  FAILED: "border-destructive text-destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkflowRuns({
  workflowId,
  workflowName,
  initialRuns,
}: {
  workflowId: string;
  workflowName: string;
  initialRuns: WorkflowRun[];
}) {
  const pathname = usePathname();
  const workflowHref = pathname.replace(/\/runs$/, "");
  const [runs, setRuns] = useState(initialRuns);
  const [statusFilter, setStatusFilter] = useState<WorkflowRunStatus | "ALL">("ALL");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered =
    statusFilter === "ALL" ? runs : runs.filter((run) => run.status === statusFilter);

  async function handleRetry(runId: string) {
    setRetryingId(runId);
    try {
      const updated = await retryWorkflowRun(workflowId, runId);
      setRuns((prev) => prev.map((run) => (run.id === runId ? updated : run)));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div data-tour="consultant-workflow-runs" className="flex flex-col gap-4">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={workflowHref} className="hover:text-foreground">
          {workflowName}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="text-primary">Run history</span>
      </nav>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Run history</h2>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="WAITING">Waiting</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No runs here yet.
            </p>
          )}
          {filtered.map((run) => (
            <div
              key={run.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Started {formatDate(run.createdAt)}
                </p>
                {run.status === "FAILED" && run.failureReason && (
                  <p className="truncate text-xs text-destructive">{run.failureReason}</p>
                )}
                {run.status === "WAITING" && run.resumeAt && (
                  <p className="text-xs text-muted-foreground">
                    Resumes {formatDate(run.resumeAt)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={cn(STATUS_BADGE[run.status])}>{run.status}</Badge>
                {run.status === "FAILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={retryingId === run.id}
                    onClick={() => handleRetry(run.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
