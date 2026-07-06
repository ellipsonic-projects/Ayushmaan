import { SettingsHeader } from "@/components/tenant/admin/settings/settings-header";
import { SettingsSectionNav } from "@/components/tenant/admin/settings/settings-section-nav";
import { SettingsForm } from "@/components/tenant/admin/settings/settings-form";

export default function TenantSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        <SettingsSectionNav />
        <SettingsForm />
      </div>
    </div>
  );
}
