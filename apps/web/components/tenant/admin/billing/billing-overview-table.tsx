import { Receipt } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function BillingOverviewTable() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <Receipt className="h-5 w-5" />
          Billing isn&apos;t connected for this organization yet.
        </div>
      </CardContent>
    </Card>
  );
}
