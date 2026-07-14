import { TenantDetailHeader } from "@/components/platform/tenants/tenant-detail-header";
import { TenantDetailStatsRow } from "@/components/platform/tenants/tenant-detail-stats-row";
import { TenantProfileCard } from "@/components/platform/tenants/tenant-profile-card";
import { TenantOperationalSettings } from "@/components/platform/tenants/tenant-operational-settings";
import { TenantCommercialCard } from "@/components/platform/tenants/tenant-commercial-card";
import { TenantStaffOverview } from "@/components/platform/tenants/tenant-staff-overview";
import { TenantCustomLayoutCard } from "@/components/platform/tenants/tenant-custom-layout-card";

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <TenantDetailHeader tenantId={id} name="Acme Global Solutions" status="Active" />
      <TenantDetailStatsRow />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <TenantProfileCard
            tenantId={id}
            adminName="Ramesh"
            adminEmail="admin@acme-global.com"
            joinedOn="Oct 12, 2023"
          />
          <TenantOperationalSettings />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
          <TenantCommercialCard licenseType="Enterprise" mrr="$12,450.00" arr="$149,400.00" />
          <TenantCustomLayoutCard tenantId={tenantId ?? null} />
          <TenantStaffOverview />
        </aside>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Private access granted by Super Admin. Only visible to the platform owner. Session tracked
        and audit-verified.
      </p>
    </div>
  );
}
