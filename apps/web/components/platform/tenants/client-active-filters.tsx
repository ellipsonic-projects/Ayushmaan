"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientActiveFilters({
  totalRecords,
  consultants,
}: {
  totalRecords: number;
  consultants: { id: string; fullName: string }[];
}) {
  const [consultant, setConsultant] = useState("All");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, ID or email..." className="h-9 pl-9" />
        </div>
        <Select value={consultant} onValueChange={(value) => setConsultant(value ?? "All")}>
          <SelectTrigger size="sm" className="h-9 gap-1.5">
            <span className="text-muted-foreground">Consultant:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {consultants.map((c) => (
              <SelectItem key={c.id} value={c.fullName}>
                {c.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span>Showing 10 of {totalRecords.toLocaleString()} results</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon-sm">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
