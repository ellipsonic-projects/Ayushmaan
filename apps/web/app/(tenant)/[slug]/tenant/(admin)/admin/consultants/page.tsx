import { ConsultantsHeader } from "@/components/tenant/admin/consultants-directory/consultants-header";
import { ConsultantsStatsRow } from "@/components/tenant/admin/consultants-directory/consultants-stats-row";
import { ConsultantsTable } from "@/components/tenant/admin/consultants-directory/consultants-table";
import { getTenantConsultants } from "@/lib/api/consultants.server";

export default async function ConsultantsDirectoryPage() {
  const consultants = await getTenantConsultants();

  return (
    <div className="flex flex-col gap-6">
      <ConsultantsHeader />
      <ConsultantsStatsRow consultants={consultants} />
      <ConsultantsTable initialConsultants={consultants} />
    </div>
  );
}
