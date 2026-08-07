import { HelpBanner } from "@/components/tenant/consultant/help/help-banner";
import { HelpResourceGrid } from "@/components/tenant/consultant/help/help-resource-grid";
import { HelpSidebar } from "@/components/tenant/consultant/help/help-sidebar";

export default function ConsultantHelpPage() {
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
