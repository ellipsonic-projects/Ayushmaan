"use client";

import { useState } from "react";
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

const plans = ["All Tiers", "Enterprise", "Pro", "Trial"];

export function TenantFilters() {
  const [plan, setPlan] = useState("All Tiers");

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, slug or email..."
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Plan
        </Label>
        <div className="flex flex-col gap-1">
          {plans.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setPlan(label)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                plan === label
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
        <Label className="text-xs font-medium text-muted-foreground">
          Sort by Joining Date
        </Label>
        <Select defaultValue="newest">
          <SelectTrigger size="sm" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
