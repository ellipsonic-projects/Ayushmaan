"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { respondToReschedule, cancelOwnAppointment } from "@/lib/api/clients.client";
import type { ClientAppointmentStatus } from "@/lib/api/clients.server";

export interface ClientAppointmentRow {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ClientAppointmentStatus;
  meetingLink: string | null;
  forName: string | null; // null when this is the client's own appointment, not a dependent's
  consultantName: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

const PAST_STATUSES: ClientAppointmentStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

function byScheduledStart(a: ClientAppointmentRow, b: ClientAppointmentRow) {
  return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
}

function RowCard({ row, children }: { row: ClientAppointmentRow; children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {row.consultantName} · {row.tenantName}
              {row.forName ? ` · for ${row.forName}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(row.scheduledStart), "EEE, MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

export function ClientAppointmentsView({ initialRows }: { initialRows: ClientAppointmentRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const needsResponse = rows
    .filter((r) => r.status === "RESCHEDULE_PROPOSED")
    .sort(byScheduledStart);
  const upcoming = rows
    .filter((r) => !PAST_STATUSES.includes(r.status) && r.status !== "RESCHEDULE_PROPOSED")
    .sort(byScheduledStart);
  const past = rows.filter((r) => PAST_STATUSES.includes(r.status)).sort(byScheduledStart);

  async function respond(row: ClientAppointmentRow, accept: boolean) {
    setPendingId(row.id);
    try {
      await respondToReschedule(row.tenantId, row.tenantSlug, row.id, accept);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: accept ? "ADMIN_APPROVED" : "CANCELLED" } : r
        )
      );
    } finally {
      setPendingId(null);
    }
  }

  async function cancel(row: ClientAppointmentRow) {
    setPendingId(row.id);
    try {
      await cancelOwnAppointment(row.tenantId, row.tenantSlug, row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "CANCELLED" } : r)));
    } catch {
      alert("This appointment can no longer be cancelled — it's too close to the scheduled start.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8" data-tour="client-appointments-list">
      {needsResponse.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Needs your response</h3>
          <div className="flex flex-col gap-3">
            {needsResponse.map((row) => (
              <RowCard key={row.id} row={row}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === row.id}
                  onClick={() => respond(row, false)}
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  disabled={pendingId === row.id}
                  onClick={() => respond(row, true)}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Accept
                </Button>
              </RowCard>
            ))}
          </div>
        </section>
      )}

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
            {upcoming.map((row) => (
              <RowCard key={row.id} row={row}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === row.id}
                  onClick={() => cancel(row)}
                >
                  Cancel
                </Button>
              </RowCard>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Past</h3>
          <div className="flex flex-col gap-3">
            {past.map((row) => (
              <RowCard key={row.id} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
