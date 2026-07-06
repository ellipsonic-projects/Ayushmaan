import { BillingHeader } from "@/components/tenant/admin/billing/billing-header";
import { BillingStatsRow } from "@/components/tenant/admin/billing/billing-stats-row";
import { BookingsPaymentsLedger } from "@/components/tenant/admin/billing/bookings-payments-ledger";

export default function TenantBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <BillingHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
        <BillingStatsRow />
        <BookingsPaymentsLedger />
      </div>
    </div>
  );
}
