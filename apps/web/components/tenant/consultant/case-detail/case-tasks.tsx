"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, ShieldAlert, ListTodo } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/api/case-detail.client";
import type { CaseTask, TaskDbStatus } from "@/lib/api/case-detail.server";

const statusIcon: Record<TaskDbStatus, typeof Circle> = {
  OPEN: Circle,
  COMPLETED: CheckCircle2,
  OVERDUE: ShieldAlert,
};

const statusLabel: Record<TaskDbStatus, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

const statusBadgeClass: Record<TaskDbStatus, string> = {
  OPEN: "text-muted-foreground",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  OVERDUE: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function CaseTasks({ caseId, tasks: initialTasks }: { caseId: string; tasks: CaseTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddTask() {
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const created = await createTask(caseId, {
        title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      });
      setTasks((prev) => [created, ...prev]);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a task, or use the mic to dictate..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="w-fit"
              onClick={handleAddTask}
              disabled={!draft.trim() || submitting}
            >
              Add task
            </Button>
            <VoiceTranscribeButton
              label="Dictate task"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">No tasks yet.</p>
        ) : (
          <div className="space-y-4 border-t border-border pt-5">
            {tasks.map((item) => {
              const Icon = statusIcon[item.status];
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 translate-y-0.5",
                      statusBadgeClass[item.status]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Assigned to {item.assignedTo === "CONSULTANT" ? "You" : "Client"}
                      {item.dueAt &&
                        ` · Due ${format(new Date(item.dueAt), "EEE, dd MMM · h:mm a")}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0", statusBadgeClass[item.status])}
                  >
                    {statusLabel[item.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
