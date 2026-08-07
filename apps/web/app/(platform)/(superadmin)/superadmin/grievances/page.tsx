"use client";

import { useMemo, useState } from "react";

import { GrievancesHeader } from "@/components/platform/grievances/grievances-header";
import { GrievancesStatsRow } from "@/components/platform/grievances/grievances-stats-row";
import {
  GrievanceFilters,
  type GrievanceFiltersState,
} from "@/components/platform/grievances/grievance-filters";
import { GrievancesTable } from "@/components/platform/grievances/grievances-table";
import { useGrievances } from "@/lib/hooks";

export default function GrievancesPage() {
  const { grievances, isLoading, error } = useGrievances({ limit: 100 });
  const [filters, setFilters] = useState<GrievanceFiltersState>({
    status: "all",
    severity: "all",
    category: "all",
    search: "",
  });

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return grievances.filter((g) => {
      if (filters.status !== "all" && g.status !== filters.status) return false;
      if (filters.severity !== "all" && g.severity !== filters.severity) return false;
      if (filters.category !== "all" && g.category !== filters.category) return false;
      if (!query) return true;
      return (
        g.id.toLowerCase().includes(query) ||
        (g.client?.fullName ?? "").toLowerCase().includes(query)
      );
    });
  }, [grievances, filters]);

  return (
    <div className="flex flex-col gap-6">
      <GrievancesHeader />
      <GrievancesStatsRow grievances={grievances} />
      <GrievanceFilters value={filters} onChange={setFilters} />
      <GrievancesTable grievances={filtered} isLoading={isLoading} error={error} />
    </div>
  );
}
