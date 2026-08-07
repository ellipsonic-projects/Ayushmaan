import { Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TransactionLedger() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Transaction Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <Receipt className="h-5 w-5" />
          No transactions to show yet.
        </div>
      </CardContent>
    </Card>
  );
}
