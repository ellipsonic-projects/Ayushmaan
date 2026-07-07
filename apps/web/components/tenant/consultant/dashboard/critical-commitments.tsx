import { Clock3, CheckCircle2, ShieldAlert } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Urgency = "due-in" | "due-today";

type Commitment = {
  title: string;
  client: string;
  urgency: Urgency;
  badgeLabel: string;
};

const commitments: Commitment[] = [
  {
    title: "Submit Radiology Report",
    client: "Client: City General (#892-ALPHA)",
    urgency: "due-in",
    badgeLabel: "DUE IN 2H",
  },
  {
    title: "Draft Case Summary",
    client: "Client: Nexus Labs (#892-BETA)",
    urgency: "due-today",
    badgeLabel: "DUE TODAY",
  },
];

const urgencyIconClass: Record<Urgency, string> = {
  "due-in": "text-amber-600 dark:text-amber-500",
  "due-today": "text-muted-foreground",
};

const urgencyBadgeClass: Record<Urgency, string> = {
  "due-in":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  "due-today": "bg-foreground text-background",
};

export function CriticalCommitments() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Critical Commitments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {commitments.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            {item.urgency === "due-in" ? (
              <Clock3 className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[item.urgency])} />
            ) : (
              <CheckCircle2 className={cn("h-4 w-4 shrink-0 translate-y-0.5", urgencyIconClass[item.urgency])} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.client}</p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", urgencyBadgeClass[item.urgency])}>
              {item.badgeLabel}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
