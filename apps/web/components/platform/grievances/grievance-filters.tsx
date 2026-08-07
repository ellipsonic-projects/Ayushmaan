"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GrievanceFiltersState {
  status: string;
  severity: string;
  category: string;
  search: string;
}

export function GrievanceFilters({
  value,
  onChange,
}: {
  value: GrievanceFiltersState;
  onChange: (value: GrievanceFiltersState) => void;
}) {
  const isFiltered =
    value.status !== "all" ||
    value.severity !== "all" ||
    value.category !== "all" ||
    value.search !== "";

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={value.status}
          onValueChange={(status) => onChange({ ...value, status: status ?? "all" })}
        >
          <SelectTrigger size="sm" className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={value.severity}
          onValueChange={(severity) => onChange({ ...value, severity: severity ?? "all" })}
        >
          <SelectTrigger size="sm" className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={value.category}
          onValueChange={(category) => onChange({ ...value, category: category ?? "all" })}
        >
          <SelectTrigger size="sm" className="h-9 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="SERVICE_QUALITY">Service Quality</SelectItem>
            <SelectItem value="BILLING_DISPUTE">Billing Dispute</SelectItem>
            <SelectItem value="MISCONDUCT">Misconduct</SelectItem>
            <SelectItem value="DATA_PRIVACY">Data Privacy</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() =>
              onChange({ status: "all", severity: "all", category: "all", search: "" })
            }
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="relative w-full lg:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by ID or Submitter..."
          className="h-9 pl-9"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>
    </div>
  );
}
