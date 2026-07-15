import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";
import { getMyTasks, type MyTask } from "@/lib/api/commitments.server";

type Urgency = "overdue" | "due-today" | "upcoming";

function taskUrgency(task: MyTask): { urgency: Urgency; label: string } {
  const now = new Date();
  if (task.status === "OVERDUE" || (task.dueAt && new Date(task.dueAt) < now)) {
    return { urgency: "overdue", label: "OVERDUE" };
  }
  if (!task.dueAt) return { urgency: "upcoming", label: "NO DUE DATE" };

  const due = new Date(task.dueAt);
  if (due.toDateString() === now.toDateString()) return { urgency: "due-today", label: "TODAY" };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) {
    return { urgency: "upcoming", label: "TOMORROW" };
  }
  return {
    urgency: "upcoming",
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
  };
}

const urgencyIconClass: Record<Urgency, string> = {
  overdue: "text-destructive",
  "due-today": "text-muted-foreground",
  upcoming: "text-muted-foreground",
};

const urgencyBadgeClass: Record<Urgency, string> = {
  overdue: "bg-destructive text-destructive-foreground",
  "due-today":
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  upcoming:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
};

export async function PriorityTasks() {
  const consultant = await getOwnConsultantProfile();
  const tasks = consultant ? await getMyTasks(consultant.id) : [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No open tasks.</p>}
        {tasks.map((item) => {
          const { urgency, label } = taskUrgency(item);
          return (
            <div key={item.id} className="flex items-start gap-3">
              {urgency === "overdue" ? (
                <AlertCircle
                  className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[urgency])}
                />
              ) : (
                <CheckCircle2
                  className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[urgency])}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Client: {item.case.client.fullName}
                </p>
              </div>
              <Badge
                variant={urgency === "overdue" ? "default" : "outline"}
                className={cn("shrink-0", urgencyBadgeClass[urgency])}
              >
                {label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          Manage All Tasks ({tasks.length})
        </Button>
      </CardFooter>
    </Card>
  );
}
