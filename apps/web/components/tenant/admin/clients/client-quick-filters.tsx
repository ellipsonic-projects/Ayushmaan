"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filters = ["All", "Pinned", "High Priority", "Chronic Care", "Needs Hindi"];

export function ClientQuickFilters() {
  const [active, setActive] = useState("All");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quick Filters
        </span>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === filter
                ? "border-transparent bg-secondary text-secondary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Advanced Filters
      </Button>
    </div>
  );
}
