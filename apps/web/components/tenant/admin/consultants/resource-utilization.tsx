import { Sparkles } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const consultants = [
  { name: "Jane Doe", utilization: 92 },
  { name: "Marcus Reed", utilization: 45 },
  { name: "Sarah Linn", utilization: 105 },
];

function barClass(utilization: number) {
  if (utilization > 100) return "bg-destructive";
  if (utilization >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export function ResourceUtilization() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {consultants.map((consultant) => (
          <div key={consultant.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{consultant.name}</span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  consultant.utilization > 100 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {consultant.utilization}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", barClass(consultant.utilization))}
                style={{ width: `${Math.min(consultant.utilization, 100)}%` }}
              />
            </div>
            {consultant.utilization > 100 && (
              <p className="text-[11px] text-destructive">Over capacity: Action required</p>
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="secondary" className="w-full gap-1.5">
          <Sparkles className="h-4 w-4" />
          Run Optimization AI
        </Button>
      </CardFooter>
    </Card>
  );
}
