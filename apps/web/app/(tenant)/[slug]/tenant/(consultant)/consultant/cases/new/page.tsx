import { NewCaseForm } from "@/components/tenant/consultant/cases/new-case-form";
import { getTenantClients } from "@/lib/api/clients.server";

export default async function NewCasePage() {
  const clients = await getTenantClients();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">New Case</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a client to a new case, along with any documents they&apos;ve provided. Interactions,
          commitments, and tasks are then tracked within the case.
        </p>
      </div>
      <div data-tour="consultant-new-case-form">
        <NewCaseForm clients={clients} />
      </div>
    </div>
  );
}
