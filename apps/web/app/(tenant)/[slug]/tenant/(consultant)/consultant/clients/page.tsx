import { Plus } from "lucide-react";

import { ClientsHeader } from "@/components/tenant/admin/clients/clients-header";
import { ClientStatsRow } from "@/components/tenant/admin/clients/client-stats-row";
import { ClientQuickFilters } from "@/components/tenant/admin/clients/client-quick-filters";
import { ClientsTable } from "@/components/tenant/admin/clients/clients-table";
import { Button } from "@/components/ui/button";
import {
  getTenantClients,
  filterClientsByDeadline,
  type ClientDeadlineFilter,
} from "@/lib/api/clients.server";

export default async function ConsultantClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: ClientDeadlineFilter }>;
}) {
  const { filter } = await searchParams;
  const clients = await getTenantClients();
  const filteredClients = filterClientsByDeadline(clients, filter ?? null);

  return (
    <div className="relative flex flex-col gap-6">
      <ClientsHeader />
      <ClientStatsRow clients={clients} />
      <ClientQuickFilters />
      <ClientsTable clients={filteredClients} />

      <Button
        size="icon-lg"
        className="fixed bottom-6 right-6 rounded-full shadow-lg"
        aria-label="Add new client"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}
