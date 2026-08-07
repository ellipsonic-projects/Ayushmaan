"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAudienceEstimate, type AudienceFilter } from "@/lib/hooks";

export function EstimatedImpactPanel({ filter }: { filter: AudienceFilter }) {
  const { recipientCount, isLoading } = useAudienceEstimate(filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estimated Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated Reach:</span>
          <span className="font-semibold text-foreground">
            {isLoading ? "…" : `${recipientCount.toLocaleString()} Recipients`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
