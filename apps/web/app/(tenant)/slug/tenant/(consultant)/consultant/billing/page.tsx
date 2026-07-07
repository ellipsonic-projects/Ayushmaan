import { Receipt } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function ConsultantBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Billing</h2>
      <ComingSoon
        icon={Receipt}
        title="Your billing ledger is on the way"
        description="Track invoices, payments, and payouts for your own client roster."
      />
    </div>
  );
}
