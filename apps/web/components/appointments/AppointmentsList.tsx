"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useAppointments, cancelAppointment } from "@/lib/hooks/useAppointments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppointmentsListProps {
  userRole: "client" | "consultant";
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  confirmed: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AppointmentsList({ userRole }: AppointmentsListProps) {
  const { token } = useAuth();
  const { appointments, isLoading, error, mutate } = useAppointments();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!token) return;
    setCancellingId(id);
    try {
      await cancelAppointment(token, id);
      await mutate();
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading appointments...</p>;
  }

  if (error) {
    return <p className="text-red-600 dark:text-red-400">Failed to load appointments.</p>;
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          You don&apos;t have any appointments yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const other =
          userRole === "client" ? appointment.consultantName : appointment.clientName;

        return (
          <Card key={appointment.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {appointment.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {other || (userRole === "client" ? "Consultant" : "Client")}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {formatDateTime(appointment.startTime)} – {formatDateTime(appointment.endTime)}
                </p>
                {appointment.meetingLink && (
                  <a
                    href={appointment.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Join meeting
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={statusVariant[appointment.status] ?? "outline"}>
                  {appointment.status}
                </Badge>
                {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancellingId === appointment.id}
                    onClick={() => handleCancel(appointment.id)}
                  >
                    {cancellingId === appointment.id ? "Cancelling..." : "Cancel"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
