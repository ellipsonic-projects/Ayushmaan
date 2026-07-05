import { SessionLogHeader } from "@/components/platform/tenants/session-log-header";
import { SessionPeriodTabs } from "@/components/platform/tenants/session-period-tabs";
import { SessionStatsRow } from "@/components/platform/tenants/session-stats-row";
import { SessionActiveFilters } from "@/components/platform/tenants/session-active-filters";
import { SessionsTable } from "@/components/platform/tenants/sessions-table";

const TOTAL_RECORDS = 1248;

export default function TenantSessionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SessionLogHeader
        tenantId="TNT-88921-XQ"
        tenantName="Acme Global Solutions"
        totalRecords={TOTAL_RECORDS}
      />

      <SessionPeriodTabs />

      <SessionStatsRow />

      <SessionActiveFilters totalRecords={TOTAL_RECORDS} />

      <SessionsTable totalRecords={TOTAL_RECORDS} />
    </div>
  );
}
