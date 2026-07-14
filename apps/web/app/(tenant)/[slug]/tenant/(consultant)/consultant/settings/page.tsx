import { ConsultantSettingsHeader } from "@/components/tenant/consultant/settings/settings-header";
import { ConsultantSettingsSectionNav } from "@/components/tenant/consultant/settings/settings-section-nav";
import { ConsultantSettingsForm } from "@/components/tenant/consultant/settings/settings-form";

export default function ConsultantSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ConsultantSettingsHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        <ConsultantSettingsSectionNav />
        <ConsultantSettingsForm />
      </div>
    </div>
  );
}
