import { BarChart3 } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function TenantAdminInsightsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Insights</h2>
      <ComingSoon
        icon={BarChart3}
        title="Practice-wide insights are on the way"
        description="Revenue, retention, and utilization trends across every consultant in your tenant."
      />
    </div>
  );
}
