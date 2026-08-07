import { SettingsHeader } from "@/components/tenant/admin/settings/settings-header";
import { SettingsSectionNav } from "@/components/tenant/admin/settings/settings-section-nav";
import { SettingsForm } from "@/components/tenant/admin/settings/settings-form";
import { getTenantConsultants } from "@/lib/api/consultants.server";

export default async function TenantSettingsPage() {
  const consultants = await getTenantConsultants();

  return (
    <div className="flex flex-col gap-6">
      <SettingsHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        <SettingsSectionNav />
        <SettingsForm consultants={consultants} />
      </div>
    </div>
  );
}
