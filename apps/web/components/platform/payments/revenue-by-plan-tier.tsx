import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RevenueByPlanTier() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Plan Tier</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          No billing data connected yet.
        </div>
      </CardContent>
    </Card>
  );
}
