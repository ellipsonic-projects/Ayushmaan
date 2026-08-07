import { notFound } from "next/navigation";

import { ConsultantDirectoryHeader } from "@/components/platform/tenants/consultant-directory-header";
import { ConsultantsTable } from "@/components/platform/tenants/consultants-table";
import { ConsultantStatsRow } from "@/components/platform/tenants/consultant-stats-row";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantConsultants } from "@/lib/api/platform-consultants.server";

export default async function TenantConsultantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const consultants = await getPlatformTenantConsultants(id, tenant.slug);

  return (
    <div className="flex flex-col gap-6">
      <ConsultantDirectoryHeader
        tenantId={id}
        tenantSlug={tenant.slug}
        tenantName={tenant.displayName}
        totalConsultants={consultants.length}
      />

      <ConsultantsTable tenantId={id} tenantSlug={tenant.slug} consultants={consultants} />

      <ConsultantStatsRow consultants={consultants} />
    </div>
  );
}
