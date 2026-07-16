"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, TenantAppointment } from "@/lib/api/appointments.server";
import { updatePlatformTenantAppointment } from "@/lib/api/platform-appointments.client";

const statusClass: Record<AppointmentStatus, string> = {
  REQUESTED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  ADMIN_APPROVED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  APPROVED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  RESCHEDULE_PROPOSED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  NO_SHOW:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const CANCELLABLE_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "ADMIN_APPROVED",
  "RESCHEDULE_PROPOSED",
  "APPROVED",
];

export function SessionsTable({
  appointments,
  tenantId,
  tenantSlug,
}: {
  appointments: TenantAppointment[];
  tenantId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<TenantAppointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  function openCancelDialog(appointment: TenantAppointment) {
    setCancellationReason("");
    setCancelTarget(appointment);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await updatePlatformTenantAppointment(tenantId, tenantSlug, cancelTarget.id, {
        status: "CANCELLED",
        cancellationReason: cancellationReason || undefined,
      });
      setCancelTarget(null);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card size="sm">
      <CardContent className="px-0">
        <div className="max-h-112 overflow-auto px-4">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Scheduled</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No appointments found.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {appointment.case.consultant?.fullName ?? "Unassigned"}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {appointment.case.client.fullName}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                      {new Date(appointment.scheduledStart).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", statusClass[appointment.status])}
                      >
                        {appointment.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {CANCELLABLE_STATUSES.includes(appointment.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCancelDialog(appointment)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
            <DialogDescription>
              {cancelTarget &&
                `The appointment between ${cancelTarget.case.client.fullName} and ${cancelTarget.case.consultant?.fullName ?? "an unassigned consultant"} will be cancelled. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for cancellation (optional)"
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep Appointment</DialogClose>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
