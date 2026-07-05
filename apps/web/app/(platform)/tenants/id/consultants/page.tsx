import { ConsultantDirectoryHeader } from "@/components/platform/tenants/consultant-directory-header";
import { ConsultantsTable } from "@/components/platform/tenants/consultants-table";
import { ConsultantStatsRow } from "@/components/platform/tenants/consultant-stats-row";

const TOTAL_CONSULTANTS = 124;

export default function TenantConsultantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ConsultantDirectoryHeader
        tenantId="TNT-88921-XQ"
        tenantName="Acme Global Solutions"
        totalConsultants={TOTAL_CONSULTANTS}
      />

      <ConsultantsTable totalRecords={TOTAL_CONSULTANTS} />

      <ConsultantStatsRow />
    </div>
  );
}
