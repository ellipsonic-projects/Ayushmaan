import { StatsGrid } from "@/components/platform/dashboard/stats-grid";
import { RecentTenants } from "@/components/platform/dashboard/recent-tenants";
import { GrievanceInbox } from "@/components/platform/dashboard/grievance-inbox";

export default function SuperAdminDashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      <div className="xl:col-span-4">
        <StatsGrid />
      </div>
      <div className="xl:col-span-3">
        <RecentTenants />
      </div>
      <div className="xl:col-span-1">
        <GrievanceInbox />
      </div>
    </div>
  );
}
