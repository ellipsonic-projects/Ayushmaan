"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { listOwnCases, type OwnCaseSummary } from "@/lib/api/case-detail.client";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CasePicker({ onSelect }: { onSelect: (scribeCase: OwnCaseSummary) => void }) {
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<OwnCaseSummary[] | null>(null);

  useEffect(() => {
    listOwnCases()
      .then(setCases)
      .catch(() => setCases([]));
  }, []);

  const filtered = (cases ?? []).filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.client.fullName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.matterKey?.toLowerCase().includes(q) ?? false)
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
          placeholder="Search cases by client, matter, or category..."
          className="h-9 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        {cases === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading cases...
          </div>
        ) : filtered.length === 0 ? (
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
                  {initials(item.client.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.client.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.matterKey ?? item.category}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
