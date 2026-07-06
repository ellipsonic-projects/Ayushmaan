import { ConsultantsHeader } from "@/components/tenant/admin/consultants-directory/consultants-header";
import { ConsultantsStatsRow } from "@/components/tenant/admin/consultants-directory/consultants-stats-row";
import { ConsultantsTable } from "@/components/tenant/admin/consultants-directory/consultants-table";

export default function ConsultantsDirectoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <ConsultantsHeader />
      <ConsultantsStatsRow />
      <ConsultantsTable />
    </div>
  );
}
