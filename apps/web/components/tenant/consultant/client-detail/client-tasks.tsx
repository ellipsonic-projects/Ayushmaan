"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock3, ListTodo } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { cn } from "@/lib/utils";
import type {
  TaskItem,
  TaskStatus,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

const statusIcon: Record<TaskStatus, typeof Circle> = {
  Pending: Circle,
  "In Progress": Clock3,
  Completed: CheckCircle2,
};

const statusBadgeClass: Record<TaskStatus, string> = {
  Pending: "text-muted-foreground",
  "In Progress":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

export function ClientTasks({ tasks: initialTasks }: { tasks: TaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState("");

  function handleAddTask() {
    const content = draft.trim();
    if (!content) return;

    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
        assignedTo: "You",
        status: "Pending",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      ...prev,
    ]);
    setDraft("");
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
            <Button size="sm" className="w-fit" onClick={handleAddTask} disabled={!draft.trim()}>
              Add task
            </Button>
            <VoiceTranscribeButton
              label="Dictate task"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          {tasks.map((item) => {
            const Icon = statusIcon[item.status];
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Icon className={cn("h-4 w-4 shrink-0 translate-y-0.5", statusBadgeClass[item.status])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assigned to {item.assignedTo} &middot; Due {format(item.dueAt, "EEE, dd MMM · h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0", statusBadgeClass[item.status])}>
                  {item.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
