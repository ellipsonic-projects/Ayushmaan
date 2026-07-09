import { CasesHeader } from "@/components/tenant/consultant/cases/cases-header";
import { CasesStatsRow } from "@/components/tenant/consultant/cases/cases-stats-row";
import { CasesTable } from "@/components/tenant/consultant/cases/cases-table";

export default function ConsultantCasesPage() {
  return (
    <div className="flex flex-col gap-6">
      <CasesHeader />
      <CasesStatsRow />
      <CasesTable />
    </div>
  );
}
