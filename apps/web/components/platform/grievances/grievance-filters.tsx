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

export function GrievanceFilters() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select defaultValue="all-statuses">
          <SelectTrigger size="sm" className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All States</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under-review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-severities">
          <SelectTrigger size="sm" className="h-9 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-severities">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-categories">
          <SelectTrigger size="sm" className="h-9 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-categories">All Categories</SelectItem>
            <SelectItem value="service-quality">Service Quality</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="misconduct">Misconduct</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear Filters
        </Button>
      </div>

      <div className="relative w-full lg:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by ID or Submitter..." className="h-9 pl-9" />
      </div>
    </div>
  );
}
