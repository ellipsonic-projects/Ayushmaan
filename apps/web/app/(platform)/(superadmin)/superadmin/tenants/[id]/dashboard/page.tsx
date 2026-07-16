import { notFound } from "next/navigation";

import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { TenantStatsRow } from "@/components/tenant/admin/dashboard/stats-row";
import { UpcomingAppointments } from "@/components/tenant/admin/dashboard/upcoming-appointments";
import { ConsultantStatus } from "@/components/tenant/admin/dashboard/consultant-status";
import { RevenueOverview } from "@/components/tenant/admin/dashboard/revenue-overview";

// Mirrors the tenant-admin dashboard at
// app/(tenant)/[slug]/tenant/(admin)/admin/dashboard/page.tsx, but each
// widget is passed the [id] route param's tenant so it fetches via the
// platform-scoped API instead of the caller's own session tenant (a
// SUPER_ADMIN has none).
export default async function TenantDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const platformTenant = { tenantId: id, tenantSlug: tenant.slug };

  return (
    <div className="flex flex-col gap-6">
      <TenantStatsRow platformTenant={platformTenant} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <UpcomingAppointments platformTenant={platformTenant} />
        </div>
        <div className="xl:col-span-1">
          <ConsultantStatus platformTenant={platformTenant} />
        </div>
      </div>

      <RevenueOverview platformTenant={platformTenant} />
    </div>
  );
}
