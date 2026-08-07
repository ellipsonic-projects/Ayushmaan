"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateAppointment, approveSeries } from "@/lib/api/appointments.client";
import { type PendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";
import { useTenantSlug } from "@/lib/tenant/slug-context";

function AppointmentRow({
  item,
  children,
}: {
  item: PendingApprovalItem;
  children: React.ReactNode;
}) {
  const slug = useTenantSlug();
  return (
    <Card key={item.id}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/${slug}/tenant/consultant/appointments/${item.id}`}
          className="flex items-start gap-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground underline-offset-2 hover:underline">
              {item.clientName}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")}
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </CardContent>
    </Card>
  );
}

export function ConsultantAppointmentsQueue({
  initialAwaitingAcceptance,
  initialUpcoming,
}: {
  initialAwaitingAcceptance: PendingApprovalItem[];
  initialUpcoming: PendingApprovalItem[];
}) {
  const [awaiting, setAwaiting] = useState(initialAwaitingAcceptance);
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function accept(id: string) {
    setPendingId(id);
    try {
      await updateAppointment(id, { status: "APPROVED" });
      setAwaiting((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  async function acceptWholeSeries(item: PendingApprovalItem) {
    if (!item.seriesId) return;
    setPendingId(item.id);
    try {
      await approveSeries(item.seriesId);
      setAwaiting((prev) => prev.filter((i) => i.seriesId !== item.seriesId));
    } finally {
      setPendingId(null);
    }
  }

  async function complete(id: string) {
    setPendingId(id);
    try {
      await updateAppointment(id, { status: "COMPLETED" });
      setUpcoming((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  async function noShow(id: string) {
    setPendingId(id);
    try {
      await updateAppointment(id, { status: "NO_SHOW" });
      setUpcoming((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Awaiting your acceptance</h3>
        {awaiting.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing awaiting acceptance.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {awaiting.map((item) => (
              <AppointmentRow key={item.id} item={item}>
                {item.seriesId && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === item.id}
                    onClick={() => acceptWholeSeries(item)}
                  >
                    Accept Series
                  </Button>
                )}
                <Button size="sm" disabled={pendingId === item.id} onClick={() => accept(item.id)}>
                  Accept
                </Button>
              </AppointmentRow>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No upcoming appointments.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((item) => (
              <AppointmentRow key={item.id} item={item}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === item.id}
                  onClick={() => noShow(item.id)}
                >
                  No-show
                </Button>
                <Button
                  size="sm"
                  disabled={pendingId === item.id}
                  onClick={() => complete(item.id)}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete
                </Button>
              </AppointmentRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
