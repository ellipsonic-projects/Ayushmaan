import { CasesHeader } from "@/components/tenant/consultant/cases/cases-header";
import { CasesStatsRow } from "@/components/tenant/consultant/cases/cases-stats-row";
import { CasesTable } from "@/components/tenant/consultant/cases/cases-table";
import { getTenantCases } from "@/lib/api/cases.server";

export default async function ConsultantCasesPage() {
  const cases = await getTenantCases();

  return (
    <div className="flex flex-col gap-6">
      <CasesHeader />
      <CasesStatsRow cases={cases} />
      <CasesTable cases={cases} />
    </div>
  );
}
