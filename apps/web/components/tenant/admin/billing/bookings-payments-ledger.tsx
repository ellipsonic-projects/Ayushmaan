import { ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function BookingsPaymentsLedger() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ledger — Bookings &amp; Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-5 w-5" />
          No bookings or payments to show yet.
        </div>
      </CardContent>
    </Card>
  );
}
