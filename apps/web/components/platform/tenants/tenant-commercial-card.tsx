import { Landmark } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function TenantCommercialCard({
  licenseType,
  mrr,
  arr,
}: {
  licenseType: string;
  mrr: string;
  arr: string;
}) {
  return (
    <Card className="bg-foreground text-background ring-0">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 opacity-80" />
          <h3 className="text-sm font-semibold">Commercial Info</h3>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide opacity-70">
            License Type
          </span>
          <span className="text-sm font-semibold">{licenseType}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide opacity-70">
            MRR
          </span>
          <span className="text-sm font-semibold">{mrr}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide opacity-70">
            ARR
          </span>
          <span className="text-sm font-semibold">{arr}</span>
        </div>
      </CardContent>
    </Card>
  );
}
