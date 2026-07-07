import { Plus } from "lucide-react";

import { ClientsHeader } from "@/components/tenant/admin/clients/clients-header";
import { ClientStatsRow } from "@/components/tenant/admin/clients/client-stats-row";
import { ClientQuickFilters } from "@/components/tenant/admin/clients/client-quick-filters";
import { ClientsTable } from "@/components/tenant/admin/clients/clients-table";
import { Button } from "@/components/ui/button";

export default function ConsultantClientsPage() {
  return (
    <div className="relative flex flex-col gap-6">
      <ClientsHeader />
      <ClientStatsRow />
      <ClientQuickFilters />
      <ClientsTable />

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
