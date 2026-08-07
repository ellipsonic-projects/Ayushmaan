import { CalendarPlus, Plus } from "lucide-react";

import { ClientsHeader } from "@/components/tenant/admin/clients/clients-header";
import { ClientStatsRow } from "@/components/tenant/admin/clients/client-stats-row";
import { ClientQuickFilters } from "@/components/tenant/admin/clients/client-quick-filters";
import { ClientsTable } from "@/components/tenant/admin/clients/clients-table";
import { NewAppointmentDialog } from "@/components/tenant/consultant/clients/new-appointment-dialog";
import { Button } from "@/components/ui/button";
import {
  getTenantClients,
  filterClientsByDeadline,
  type ClientDeadlineFilter,
} from "@/lib/api/clients.server";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";

export default async function ConsultantClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: ClientDeadlineFilter }>;
}) {
  const { filter } = await searchParams;
  const [clients, ownConsultant] = await Promise.all([
    getTenantClients(),
    getOwnConsultantProfile(),
  ]);
  const filteredClients = filterClientsByDeadline(clients, filter ?? null);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ClientsHeader />
        {ownConsultant && (
          <NewAppointmentDialog
            ownConsultantId={ownConsultant.id}
            trigger={
              <Button className="gap-2">
                <CalendarPlus className="h-4 w-4" />
                New Appointment
              </Button>
            }
          />
        )}
      </div>
      <ClientStatsRow clients={clients} />
      <ClientQuickFilters />
      <ClientsTable clients={filteredClients} ownConsultantId={ownConsultant?.id} />

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
