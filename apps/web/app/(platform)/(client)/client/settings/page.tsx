import { ClientProfileSection } from "@/components/tenant/client/settings/profile-section";
import { ClientProfileDetails } from "@/components/tenant/client/settings/profile-details";
import { BecomeConsultantCard } from "@/components/tenant/client/settings/become-consultant-card";
import { getOwnClientProfile } from "@/lib/api/clients.server";
import { getOwnConsultantApplications } from "@/lib/api/consultant-applications.server";

export default async function ClientSettingsPage() {
  const [client, consultantApplications] = await Promise.all([
    getOwnClientProfile(),
    getOwnConsultantApplications(),
  ]);
  const scopeCase = client?.cases[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and notification preferences
        </p>
      </div>

      {client && scopeCase ? (
        <ClientProfileSection
          client={client}
          scopeTenantId={scopeCase.tenantId}
          scopeTenantSlug={scopeCase.tenant.slug}
        />
      ) : client ? (
        <>
          <ClientProfileDetails client={client} />
          <p className="text-sm text-muted-foreground">
            Book your first appointment to unlock profile editing.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
      )}

      {client && <BecomeConsultantCard applications={consultantApplications} />}
    </div>
  );
}
