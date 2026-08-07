import { CasesHeader } from "@/components/tenant/consultant/cases/cases-header";
import { CasesStatsRow } from "@/components/tenant/consultant/cases/cases-stats-row";
import { CasesTable } from "@/components/tenant/consultant/cases/cases-table";
import { ClaimableCasesQueue } from "@/components/tenant/consultant/cases/claimable-cases-queue";
import { getTenantCases } from "@/lib/api/cases.server";

export default async function ConsultantCasesPage() {
  const allCases = await getTenantCases();
  const claimable = allCases.filter((c) => c.status === "PENDING_ASSIGNMENT");
  const ownCases = allCases.filter((c) => c.status !== "PENDING_ASSIGNMENT");

  return (
    <div className="flex flex-col gap-6">
      <CasesHeader />
      <ClaimableCasesQueue cases={claimable} />
      <CasesStatsRow cases={ownCases} />
      <CasesTable cases={ownCases} />
    </div>
  );
}
