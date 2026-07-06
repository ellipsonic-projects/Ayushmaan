import { Layers, Star, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ConsultantStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Consultants
            </p>
            <p className="text-xl font-bold tabular-nums text-foreground">124</p>
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Star className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg Practice Rating
            </p>
            <p className="text-xl font-bold tabular-nums text-foreground">
              4.82{" "}
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                +0.2
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active Specializations
            </p>
            <p className="text-xl font-bold tabular-nums text-foreground">18</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
