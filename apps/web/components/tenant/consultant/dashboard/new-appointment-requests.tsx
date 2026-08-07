"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type PendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export function NewAppointmentRequests({ items }: { items: PendingApprovalItem[] }) {
  const slug = useTenantSlug();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          New Appointment Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing awaiting your acceptance.
          </p>
        ) : (
          items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={`/${slug}/tenant/consultant/appointments/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")}
                </p>
              </div>
              <Button variant="outline" size="sm">
                View
              </Button>
            </Link>
          ))
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="ghost" className="w-full" asChild>
          <Link href={`/${slug}/tenant/consultant/appointments`}>View all appointments</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
