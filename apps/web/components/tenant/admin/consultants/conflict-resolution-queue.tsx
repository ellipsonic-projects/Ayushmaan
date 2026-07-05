import { CalendarClock, UserX } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const conflicts = [
  {
    icon: CalendarClock,
    iconClass: "bg-red-500/10 text-red-600 dark:text-red-500",
    title: "Marcus Reed vs. Legal Team B",
    description: "Double booking for 'Case Review' at 09:00 AM",
    primaryAction: "Resolve Now",
    secondaryAction: "Reschedule",
  },
  {
    icon: UserX,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    title: "Alan Kross: Disputed Leave",
    description: "Booking conflicts with pending time-off request.",
    primaryAction: "Approve & Shift",
    secondaryAction: "Deny",
  },
];

export function ConflictResolutionQueue() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Conflict Resolution Queue</CardTitle>
        <CardAction>
          <Badge variant="destructive">{conflicts.length} Urgent</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.title}
            className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${conflict.iconClass}`}
              >
                <conflict.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {conflict.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conflict.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm">
                {conflict.secondaryAction}
              </Button>
              <Button size="sm">{conflict.primaryAction}</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
