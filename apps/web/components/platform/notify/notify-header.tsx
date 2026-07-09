import Link from "next/link";
import { ChevronRight, LayoutTemplate, Radio, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotifyHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Governance
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Notify</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Global Broadcast Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and deploy platform-wide emergency alerts and communications
          across all layers.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
        <Link href="/superadmin/notify/create">
          <Button className="gap-1.5">
            <Radio className="h-4 w-4" />
            Create Global Broadcast
          </Button>
        </Link>
        <Link href="/superadmin/notify/create">
          <Button variant="outline" className="gap-1.5">
            <Target className="h-4 w-4" />
            Create Targeted Broadcast
          </Button>
        </Link>
      </div>
    </div>
  );
}
