"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateAppointmentStatus } from "@/lib/api/appointments.client";

export type PendingAppointment = {
  id: string;
  consultantName: string;
  clientName: string;
  scheduledStart: string;
  kind: "REQUESTED" | "RESCHEDULE_PROPOSED";
};

export function ConflictResolutionQueue({ initialItems }: { initialItems: PendingAppointment[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function resolve(id: string, status: "APPROVED" | "CANCELLED") {
    setPendingId(id);
    try {
      await updateAppointmentStatus(id, status);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Conflict Resolution Queue</CardTitle>
        <CardAction>
          <Badge variant={items.length > 0 ? "destructive" : "secondary"}>
            {items.length} {items.length === 1 ? "Item" : "Items"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No appointments need attention.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  item.kind === "RESCHEDULE_PROPOSED"
                    ? "bg-red-500/10 text-red-600 dark:text-red-500"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                )}
              >
                <CalendarClock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.consultantName} · {item.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.kind === "RESCHEDULE_PROPOSED"
                    ? "Reschedule proposed for "
                    : "Awaiting approval for "}
                  {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pendingId === item.id}
                onClick={() => resolve(item.id, "CANCELLED")}
              >
                Decline
              </Button>
              <Button
                size="sm"
                disabled={pendingId === item.id}
                onClick={() => resolve(item.id, "APPROVED")}
              >
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
