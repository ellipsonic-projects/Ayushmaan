import { HelpBanner } from "@/components/tenant/admin/help/help-banner";
import { HelpResourceGrid } from "@/components/tenant/admin/help/help-resource-grid";
import { HelpSidebar } from "@/components/tenant/admin/help/help-sidebar";

export default function TenantAdminHelpPage() {
  return (
    <div className="flex flex-col gap-5">
      <HelpBanner />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <HelpResourceGrid />
        </div>
        <HelpSidebar />
      </div>
    </div>
  );
}
