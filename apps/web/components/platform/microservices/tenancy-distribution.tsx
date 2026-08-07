import { PieChart } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function TenancyDistribution() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tenancy Distribution</CardTitle>
        <CardDescription>Composition by industry sector</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <PieChart className="h-5 w-5" />
          Sector breakdown isn&apos;t available yet.
        </div>
      </CardContent>
    </Card>
  );
}
