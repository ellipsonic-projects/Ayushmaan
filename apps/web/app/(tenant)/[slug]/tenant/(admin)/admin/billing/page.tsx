import { BillingHeader } from "@/components/tenant/admin/billing/billing-header";
import { BillingStatsRow } from "@/components/tenant/admin/billing/billing-stats-row";
import { BillingOverviewTable } from "@/components/tenant/admin/billing/billing-overview-table";
import { InvoicesTable } from "@/components/tenant/admin/billing/invoices-table";
import { BookingsPaymentsLedger } from "@/components/tenant/admin/billing/bookings-payments-ledger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TenantAdminBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <BillingHeader />

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6">
          <BillingOverviewTable />
        </TabsContent>

        <TabsContent value="invoices" className="flex flex-col gap-6">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="payments" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <BillingStatsRow />
            </div>
            <div className="xl:col-span-2">
              <BookingsPaymentsLedger />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
