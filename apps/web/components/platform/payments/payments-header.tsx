import { Download, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PaymentsHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Financial Vigilance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time oversight of platform liquidity and revenue cycles.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
        <Button className="gap-1.5">
          <CreditCard className="h-4 w-4" />
          New Payout
        </Button>
      </div>
    </div>
  );
}
