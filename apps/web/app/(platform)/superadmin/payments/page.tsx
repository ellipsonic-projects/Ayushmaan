import { PaymentsHeader } from "@/components/platform/payments/payments-header";
import { PaymentsStatsRow } from "@/components/platform/payments/payments-stats-row";
import { RevenueByPlanTier } from "@/components/platform/payments/revenue-by-plan-tier";
import { TransactionLedger } from "@/components/platform/payments/transaction-ledger";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PaymentsHeader />
      <PaymentsStatsRow />
      <RevenueByPlanTier />
      <TransactionLedger />
    </div>
  );
}
