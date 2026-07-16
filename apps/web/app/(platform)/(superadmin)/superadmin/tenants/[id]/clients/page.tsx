import { notFound } from "next/navigation";

import { ClientDirectoryHeader } from "@/components/platform/tenants/client-directory-header";
import { ClientStatsRow } from "@/components/platform/tenants/client-stats-row";
import { ClientActiveFilters } from "@/components/platform/tenants/client-active-filters";
import { ClientsTable } from "@/components/platform/tenants/clients-table";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantClients } from "@/lib/api/platform-clients.server";

export default async function TenantClientsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const clients = await getPlatformTenantClients(id, tenant.slug);

  return (
    <div className="flex flex-col gap-6">
      <ClientDirectoryHeader
        tenantId={id}
        tenantSlug={tenant.slug}
        tenantName={tenant.displayName}
      />

      <ClientStatsRow clients={clients} />

      <ClientActiveFilters totalRecords={clients.length} />

      <ClientsTable clients={clients} tenantId={id} tenantSlug={tenant.slug} />
    </div>
  );
}
