import { Cloud } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STREAK_DAYS = 12;
const STREAK_DOTS = 6;
const FILLED_DOTS = 5;

export function GreetingHeader({
  name = "Aris",
  date = "Tuesday, October 24th, 2023",
}: {
  name?: string;
  date?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Good Morning, {name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{date}</p>
      </div>

      <Card size="sm" className="w-full sm:w-auto">
        <CardContent className="flex items-center gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Cloud className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1 sm:flex-none">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {STREAK_DAYS} Days
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Booking Streak
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: STREAK_DOTS }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i < FILLED_DOTS ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <Badge variant="secondary">68°F · Clear Skies</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
