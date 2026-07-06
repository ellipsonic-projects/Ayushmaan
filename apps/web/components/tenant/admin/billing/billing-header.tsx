import { FileText, CalendarRange } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function BillingHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Statement
          </span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookings and payments made by clients across your consultants.
        </p>
      </div>
      <Badge variant="outline" className="gap-1.5 self-start py-1 sm:self-auto">
        <CalendarRange className="h-3 w-3" />
        Statement Period: Oct 1 – Oct 31, 2023
      </Badge>
    </div>
  );
}
