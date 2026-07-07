import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Urgency = "overdue" | "due-today" | "tomorrow";

type Task = {
  title: string;
  client: string;
  urgency: Urgency;
  badgeLabel: string;
};

const tasks: Task[] = [
  {
    title: "Submit NDA - Nexus Labs",
    client: "Client: Nexus Labs (#892-BETA)",
    urgency: "overdue",
    badgeLabel: "OVERDUE",
  },
  {
    title: "Review Audit Trail v.2",
    client: "Client: Global Logistics Corp (#404-GAMMA)",
    urgency: "due-today",
    badgeLabel: "TODAY",
  },
  {
    title: "Prepare Q4 Projections",
    client: "Collaboration with Finance Team",
    urgency: "tomorrow",
    badgeLabel: "TOMORROW",
  },
];

const urgencyIconClass: Record<Urgency, string> = {
  overdue: "text-destructive",
  "due-today": "text-muted-foreground",
  tomorrow: "text-muted-foreground",
};

const urgencyBadgeClass: Record<Urgency, string> = {
  overdue: "bg-destructive text-destructive-foreground",
  "due-today":
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  tomorrow:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
};

export function PriorityTasks() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {tasks.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            {item.urgency === "overdue" ? (
              <AlertCircle className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[item.urgency])} />
            ) : (
              <CheckCircle2 className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[item.urgency])} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.client}</p>
            </div>
            <Badge
              variant={item.urgency === "overdue" ? "default" : "outline"}
              className={cn("shrink-0", urgencyBadgeClass[item.urgency])}
            >
              {item.badgeLabel}
            </Badge>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          Manage All Tasks (12)
        </Button>
      </CardFooter>
    </Card>
  );
}
