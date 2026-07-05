import { BillingHeader } from "@/components/tenant/admin/billing/billing-header";
import { BillingStatsRow } from "@/components/tenant/admin/billing/billing-stats-row";
import { BookingsPaymentsLedger } from "@/components/tenant/admin/billing/bookings-payments-ledger";

export default function TenantBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <BillingHeader />
      <BillingStatsRow />
      <BookingsPaymentsLedger />
    </div>
  );
}
