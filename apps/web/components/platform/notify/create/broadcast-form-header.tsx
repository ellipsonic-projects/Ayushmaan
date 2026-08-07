import Link from "next/link";
import { ChevronRight, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BroadcastFormHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/notify" className="hover:text-foreground">
            Broadcasts
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Create New</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Initialize System-Wide Broadcast
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure and deploy an administrative announcement across the
          Ayushman network.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/notify">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button className="gap-1.5">
          <Send className="h-4 w-4" />
          Deploy Broadcast
        </Button>
      </div>
    </div>
  );
}
