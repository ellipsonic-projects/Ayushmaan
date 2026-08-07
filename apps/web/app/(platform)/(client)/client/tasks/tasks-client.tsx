"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ListTodo, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClientCaseTask } from "@/lib/api/client-tasks.server";
import { completeClientTask } from "@/lib/api/client-tasks.client";
import {
  createClientDocument,
  requestDocumentUploadUrl,
  uploadClientDocumentFile,
} from "@/lib/api/client-documents.client";

export interface ClientCaseOption {
  id: string;
  tenantId: string;
  tenantSlug: string;
  consultantName: string;
}

interface Props {
  cases: ClientCaseOption[];
  initialTasks: Record<string, ClientCaseTask[]>;
}

const statusBadgeClass: Record<ClientCaseTask["status"], string> = {
  OPEN: "text-muted-foreground",
  OVERDUE:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

export default function ClientTasksView({ cases, initialTasks }: Props) {
  const [tasksByCase, setTasksByCase] = useState<Record<string, ClientCaseTask[]>>(initialTasks);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [filesByTask, setFilesByTask] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);

  function updateTask(caseId: string, taskId: string, updated: ClientCaseTask) {
    setTasksByCase((prev) => ({
      ...prev,
      [caseId]: (prev[caseId] ?? []).map((t) => (t.id === taskId ? updated : t)),
    }));
  }

  // Legacy tasks (type: null, created before deliverables were tracked)
  // complete via a bare checkbox.
  async function handleComplete(caseOption: ClientCaseOption, task: ClientCaseTask) {
    setCompletingId(task.id);
    setError(null);
    try {
      const updated = await completeClientTask(caseOption.tenantId, caseOption.tenantSlug, task.id);
      updateTask(caseOption.id, task.id, updated);
    } catch {
      setError("Couldn't update the task. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  async function handleSubmitResponse(caseOption: ClientCaseOption, task: ClientCaseTask) {
    const responseText = responseDrafts[task.id]?.trim();
    if (!responseText) return;
    setCompletingId(task.id);
    setError(null);
    try {
      const updated = await completeClientTask(
        caseOption.tenantId,
        caseOption.tenantSlug,
        task.id,
        responseText
      );
      updateTask(caseOption.id, task.id, updated);
    } catch {
      setError("Couldn't submit your response. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  async function handleUploadForTask(caseOption: ClientCaseOption, task: ClientCaseTask) {
    const file = filesByTask[task.id];
    if (!file) return;
    setCompletingId(task.id);
    setError(null);
    try {
      const { path, token } = await requestDocumentUploadUrl(
        caseOption.tenantId,
        caseOption.tenantSlug,
        caseOption.id,
        file.name
      );
      await uploadClientDocumentFile(path, token, file);
      await createClientDocument(caseOption.tenantId, caseOption.tenantSlug, caseOption.id, {
        fileName: file.name,
        storagePath: path,
        taskId: task.id,
      });
      // The upload endpoint (case-documents.router.ts) auto-completes the
      // task server-side; reflect that locally rather than re-fetching.
      updateTask(caseOption.id, task.id, {
        ...task,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      });
      setFilesByTask((prev) => ({ ...prev, [task.id]: null }));
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  const allTasks = cases.flatMap((c) =>
    (tasksByCase[c.id] ?? []).map((task) => ({ caseOption: c, task }))
  );
  const openCount = allTasks.filter(({ task }) => task.status !== "COMPLETED").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Action items your consultants have assigned to you
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            Tasks
          </CardTitle>
          <CardDescription>
            {openCount} open · {allTasks.length} total
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {allTasks.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No tasks assigned yet.</p>
          )}
          {allTasks.map(({ caseOption, task }) => {
            const isLegacy = task.type === null;
            const isDone = task.status === "COMPLETED";
            const isBusy = completingId === task.id;
            const Icon = isDone ? CheckCircle2 : Circle;
            return (
              <div key={task.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    {isLegacy ? (
                      <button
                        type="button"
                        disabled={isDone || isBusy}
                        onClick={() => handleComplete(caseOption, task)}
                        className="mt-0.5 shrink-0 disabled:cursor-default"
                        aria-label={isDone ? "Completed" : "Mark as complete"}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isDone
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        />
                      </button>
                    ) : (
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isDone
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      />
                    )}
                    <div className="min-w-0 leading-tight">
                      <p
                        className={cn(
                          "truncate text-sm font-medium text-foreground",
                          isDone && "text-muted-foreground line-through"
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        With {caseOption.consultantName}
                        {task.type === "UPLOAD_DOCUMENT" && " · Upload a document"}
                        {task.type === "FILL_FORM" && " · Fill out a form"}
                        {task.type === "WRITE_RESPONSE" && " · Write a response"}
                        {task.dueAt &&
                          ` · Due ${new Date(task.dueAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}`}
                      </p>
                      {isDone && task.type === "WRITE_RESPONSE" && task.responseText && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">
                          {task.responseText}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={statusBadgeClass[task.status]}>
                      {task.status === "OPEN"
                        ? "Open"
                        : task.status === "OVERDUE"
                          ? "Overdue"
                          : "Completed"}
                    </Badge>
                  </div>
                </div>

                {!isDone && task.type === "WRITE_RESPONSE" && (
                  <div className="flex flex-col gap-2 pl-7 sm:flex-row sm:items-end">
                    <Textarea
                      value={responseDrafts[task.id] ?? ""}
                      onChange={(e) =>
                        setResponseDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      placeholder="Type your response…"
                      className="min-h-10 flex-1"
                      disabled={isBusy}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={isBusy || !responseDrafts[task.id]?.trim()}
                      onClick={() => handleSubmitResponse(caseOption, task)}
                    >
                      {isBusy ? "Submitting…" : "Submit"}
                    </Button>
                  </div>
                )}

                {!isDone && task.type === "UPLOAD_DOCUMENT" && (
                  <div className="flex flex-col gap-2 pl-7 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      className="flex-1"
                      disabled={isBusy}
                      onChange={(e) =>
                        setFilesByTask((prev) => ({
                          ...prev,
                          [task.id]: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={isBusy || !filesByTask[task.id]}
                      onClick={() => handleUploadForTask(caseOption, task)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isBusy ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                )}

                {!isDone && task.type === "FILL_FORM" && (
                  <p className="pl-7 text-xs text-muted-foreground">
                    A form was sent to you by email — open that link to complete this task.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
