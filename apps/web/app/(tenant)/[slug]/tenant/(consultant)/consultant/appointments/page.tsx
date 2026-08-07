import { getTenantAppointments } from "@/lib/api/appointments.server";
import { ConsultantAppointmentsQueue } from "@/components/tenant/consultant/appointments/consultant-appointments-queue";
import { toPendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";

export default async function ConsultantAppointmentsPage() {
  const appointments = await getTenantAppointments();

  const awaitingAcceptance = appointments
    .filter((a) => a.status === "ADMIN_APPROVED")
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .map(toPendingApprovalItem);

  const upcoming = appointments
    .filter((a) => a.status === "APPROVED")
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .map(toPendingApprovalItem);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Appointments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Accept admin-approved requests, then mark your upcoming sessions complete or no-show.
        </p>
      </div>
      <ConsultantAppointmentsQueue
        initialAwaitingAcceptance={awaitingAcceptance}
        initialUpcoming={upcoming}
      />
    </div>
  );
}
