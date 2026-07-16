import { notFound } from "next/navigation";

import { CaseDirectoryHeader } from "@/components/platform/tenants/case-directory-header";
import { CasesTable } from "@/components/platform/tenants/cases-table";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantCases } from "@/lib/api/platform-cases.server";
import { getPlatformTenantClients } from "@/lib/api/platform-clients.server";
import { getPlatformTenantConsultants } from "@/lib/api/platform-consultants.server";

export default async function TenantCasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const [cases, clients, consultants] = await Promise.all([
    getPlatformTenantCases(id, tenant.slug),
    getPlatformTenantClients(id, tenant.slug),
    getPlatformTenantConsultants(id, tenant.slug),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <CaseDirectoryHeader
        tenantId={id}
        tenantSlug={tenant.slug}
        tenantName={tenant.displayName}
        totalCases={cases.length}
        clients={clients.map((c) => ({ id: c.id, fullName: c.fullName }))}
        consultants={consultants.map((c) => ({ id: c.id, fullName: c.fullName }))}
      />

      <CasesTable cases={cases} tenantId={id} tenantSlug={tenant.slug} />
    </div>
  );
}
