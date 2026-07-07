import { GrievancesHeader } from "@/components/platform/grievances/grievances-header";
import { GrievancesStatsRow } from "@/components/platform/grievances/grievances-stats-row";
import { GrievanceFilters } from "@/components/platform/grievances/grievance-filters";
import { GrievancesTable } from "@/components/platform/grievances/grievances-table";

export default function GrievancesPage() {
  return (
    <div className="flex flex-col gap-6">
      <GrievancesHeader />
      <GrievancesStatsRow />
      <GrievanceFilters />
      <GrievancesTable />
    </div>
  );
}
