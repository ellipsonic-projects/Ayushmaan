import { AppointmentsHeader } from "@/components/tenant/admin/appointments/appointments-header";
import { PendingApprovalsTable } from "@/components/tenant/admin/appointments/pending-approvals-table";
import { toPendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";
import { getTenantAppointments } from "@/lib/api/appointments.server";

export default async function AdminAppointmentsPage() {
  const requested = await getTenantAppointments({ status: "REQUESTED" });
  const items = requested
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .map(toPendingApprovalItem);

  return (
    <div className="flex flex-col gap-6">
      <AppointmentsHeader pendingCount={items.length} />
      <PendingApprovalsTable initialItems={items} />
    </div>
  );
}
