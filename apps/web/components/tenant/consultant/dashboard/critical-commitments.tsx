import { Clock3, CheckCircle2, ShieldAlert } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";
import { getMyCommitments } from "@/lib/api/commitments.server";

function urgencyBadge(dueAt: string | null): { label: string; urgent: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil <= 4)
    return { label: `DUE IN ${Math.max(0, Math.ceil(hoursUntil))}H`, urgent: true };
  if (due.toDateString() === now.toDateString()) return { label: "DUE TODAY", urgent: false };
  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
    urgent: false,
  };
}

export async function CriticalCommitments() {
  const consultant = await getOwnConsultantProfile();
  const commitments = consultant ? await getMyCommitments(consultant.id) : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Critical Commitments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {commitments.length === 0 && (
          <p className="text-sm text-muted-foreground">No active commitments.</p>
        )}
        {commitments.map((item) => {
          const badge = urgencyBadge(item.dueAt);
          return (
            <div key={item.id} className="flex items-start gap-3">
              {badge?.urgent ? (
                <Clock3 className="h-4 w-4 shrink-0 translate-y-0.5 text-amber-600 dark:text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Client: {item.case.client.fullName}
                </p>
              </div>
              {badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    badge.urgent
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                      : "bg-foreground text-background"
                  )}
                >
                  {badge.label}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
