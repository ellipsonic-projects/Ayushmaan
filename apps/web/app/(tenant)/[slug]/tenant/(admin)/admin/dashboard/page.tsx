import { TenantStatsRow } from "@/components/tenant/admin/dashboard/stats-row";
import { UpcomingAppointments } from "@/components/tenant/admin/dashboard/upcoming-appointments";
import { ConsultantStatus } from "@/components/tenant/admin/dashboard/consultant-status";
import { RevenueOverview } from "@/components/tenant/admin/dashboard/revenue-overview";

export default function TenantAdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div data-tour="admin-stats-row">
        <TenantStatsRow />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2" data-tour="admin-upcoming-appointments">
          <UpcomingAppointments />
        </div>
        <div className="xl:col-span-1" data-tour="admin-consultant-status">
          <ConsultantStatus />
        </div>
      </div>

      <RevenueOverview />
    </div>
  );
}
