import { ClientDirectoryHeader } from "@/components/platform/tenants/client-directory-header";
import { ClientStatsRow } from "@/components/platform/tenants/client-stats-row";
import { ClientActiveFilters } from "@/components/platform/tenants/client-active-filters";
import { ClientsTable } from "@/components/platform/tenants/clients-table";

const TOTAL_CLIENTS = 1284;

export default function TenantClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ClientDirectoryHeader
        tenantId="TNT-88921-XQ"
        tenantName="Acme Global Solutions"
      />

      <ClientStatsRow />

      <ClientActiveFilters totalRecords={TOTAL_CLIENTS} />

      <ClientsTable />
    </div>
  );
}
