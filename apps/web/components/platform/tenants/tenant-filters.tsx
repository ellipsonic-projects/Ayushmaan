"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TenantsQuery } from "@/lib/hooks";

const planTiers: Array<{ label: string; value: TenantsQuery["planTier"] }> = [
  { label: "All Tiers", value: undefined },
  { label: "Standard", value: "STANDARD" },
  { label: "Pro", value: "PRO" },
  { label: "Enterprise", value: "ENTERPRISE" },
];

export function TenantFilters({
  query,
  onChange,
}: {
  query: TenantsQuery;
  onChange: (query: TenantsQuery) => void;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => onChange({})}
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name or slug..."
            className="h-9 pl-9"
            defaultValue={query.search ?? ""}
            onChange={(e) => onChange({ ...query, search: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Plan</Label>
        <div className="flex flex-col gap-1">
          {planTiers.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange({ ...query, planTier: value })}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                query.planTier === value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
        <Select
          value={query.status ?? "ALL"}
          onValueChange={(value) =>
            onChange({
              ...query,
              status: value === "ALL" ? undefined : (value as TenantsQuery["status"]),
            })
          }
        >
          <SelectTrigger size="sm" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
