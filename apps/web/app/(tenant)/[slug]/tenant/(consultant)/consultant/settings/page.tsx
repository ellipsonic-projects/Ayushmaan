import { ConsultantSettingsHeader } from "@/components/tenant/consultant/settings/settings-header";
import { ConsultantSettingsSectionNav } from "@/components/tenant/consultant/settings/settings-section-nav";
import { ConsultantProfileSection } from "@/components/tenant/consultant/settings/profile-section";
import { ConsultantSettingsForm } from "@/components/tenant/consultant/settings/settings-form";
import {
  getOwnConsultantProfile,
  getConsultantVerificationDocuments,
  getConsultantOutOfOffice,
} from "@/lib/api/consultants.server";

export default async function ConsultantSettingsPage() {
  const consultant = await getOwnConsultantProfile();
  const [documents, oooPeriods] = consultant
    ? await Promise.all([
        getConsultantVerificationDocuments(consultant.id),
        getConsultantOutOfOffice(consultant.id),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <ConsultantSettingsHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        <ConsultantSettingsSectionNav />
        {consultant ? (
          <div className="flex flex-col gap-6">
            <ConsultantProfileSection consultant={consultant} />
            <ConsultantSettingsForm
              consultant={consultant}
              documents={documents}
              oooPeriods={oooPeriods}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
        )}
      </div>
    </div>
  );
}
