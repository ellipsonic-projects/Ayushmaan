import { NewAppointmentForm } from "@/components/tenant/admin/appointments/new-appointment-form";
import { getTenantClients } from "@/lib/api/clients.server";

export default async function NewAppointmentPage() {
  const clients = await getTenantClients();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">New Appointment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Book an appointment on behalf of a client against one of their existing cases, or add a
          new client who hasn&apos;t signed up yet.
        </p>
      </div>
      <div data-tour="admin-new-appointment-form">
        <NewAppointmentForm clients={clients} />
      </div>
    </div>
  );
}
