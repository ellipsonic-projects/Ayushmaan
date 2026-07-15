"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const filters = [
  { label: "All", value: null },
  { label: "Overdue", value: "overdue" },
  { label: "Due This Week", value: "due-this-week" },
  { label: "Upcoming Appointment", value: "upcoming-appointment" },
];

export function ClientQuickFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("filter");

  function setFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("filter", value);
    } else {
      params.delete("filter");
    }
    router.push(params.size > 0 ? `?${params.toString()}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Quick Filters
      </span>
      {filters.map((filter) => (
        <button
          key={filter.label}
          type="button"
          onClick={() => setFilter(filter.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === filter.value
              ? "border-transparent bg-secondary text-secondary-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
