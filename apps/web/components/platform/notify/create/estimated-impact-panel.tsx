import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function EstimatedImpactPanel() {
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
          <span className="font-semibold text-foreground">12,450 Recipients</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Projected Delivery:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-500">
            98.2%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
