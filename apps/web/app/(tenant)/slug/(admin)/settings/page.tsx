import { SettingsHeader } from "@/components/tenant/admin/settings/settings-header";
import { SettingsForm } from "@/components/tenant/admin/settings/settings-form";

export default function TenantSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsHeader />
      <SettingsForm />
    </div>
  );
}
