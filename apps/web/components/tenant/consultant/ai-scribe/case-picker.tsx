"use client";

import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { scribeCases, type ScribeCase } from "@/components/tenant/consultant/ai-scribe/ai-scribe-data";

const statusBadgeClass: Record<ScribeCase["status"], string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Closed: "border-border text-muted-foreground",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CasePicker({ onSelect }: { onSelect: (scribeCase: ScribeCase) => void }) {
  const [query, setQuery] = useState("");

  const filtered = scribeCases.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.clientName.toLowerCase().includes(q) ||
      item.clientCode.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Select a case</h2>
        <p className="text-sm text-muted-foreground">
          Choose which case you want to log an interaction, commitment, task, or note against.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cases by client, ID, or category..."
          className="h-9 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases match your search.</p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials(item.clientName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.clientCode} &middot; {item.category}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={statusBadgeClass[item.status]}>
                  {item.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
