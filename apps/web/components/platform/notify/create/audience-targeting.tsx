"use client";

import { useState } from "react";
import { Search, X, Plus, Globe2, UserRound } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Scope = "global" | "targeted";

const scopeOptions: {
  id: Scope;
  label: string;
  note: string;
  icon: typeof Globe2;
}[] = [
  {
    id: "global",
    label: "Global Notify",
    note: "Send to every tenant on the platform",
    icon: Globe2,
  },
  {
    id: "targeted",
    label: "Targeted to One Client",
    note: "Send to a single client only",
    icon: UserRound,
  },
];

const initialTenants = ["Global Health Clinic", "City Medical Center"];

const clientOptions = [
  { value: "rahul-hegde", label: "Rahul Hegde" },
  { value: "sarah-lawson", label: "Sarah Lawson" },
  { value: "david-kim", label: "David Kim" },
  { value: "mira-sethi", label: "Mira Sethi" },
];

export function AudienceTargeting() {
  const [scope, setScope] = useState<Scope>("global");
  const [tenants, setTenants] = useState(initialTenants);
  const [client, setClient] = useState<string>("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2. Audience Targeting
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {scopeOptions.map(({ id, label, note, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:bg-muted/60",
                scope === id && "border-primary ring-1 ring-primary"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  scope === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{note}</span>
              </span>
            </button>
          ))}
        </div>

        {scope === "global" ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
            This broadcast will be sent to every tenant on the platform.
            Tenant and client filters below are disabled while Global Notify
            is selected.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Client
            </Label>
            <Select value={client} onValueChange={(v) => setClient(v ?? "")}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Search and select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={cn("flex flex-col gap-1.5", scope !== "global" && "opacity-50")}>
          <Label className="text-xs font-medium text-muted-foreground">
            Target Tenants
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clinics or hospital groups..."
              className="h-9 pl-9"
              disabled={scope !== "global"}
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {tenants.map((tenant) => (
              <Badge key={tenant} variant="secondary" className="gap-1 py-1">
                {tenant}
                <button
                  type="button"
                  disabled={scope !== "global"}
                  onClick={() =>
                    setTenants((prev) => prev.filter((t) => t !== tenant))
                  }
                  className="ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              disabled={scope !== "global"}
            >
              <Plus className="h-3.5 w-3.5" />
              Add All Active Tenants
            </Button>
          </div>
        </div>

        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", scope !== "global" && "opacity-50")}>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Consultant Roles
            </Label>
            <Select defaultValue="all-roles" disabled={scope !== "global"}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-roles">All Specialist Roles</SelectItem>
                <SelectItem value="physicians">Physicians</SelectItem>
                <SelectItem value="therapists">Therapists</SelectItem>
                <SelectItem value="nurses">Nurses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Client Groups
            </Label>
            <Select defaultValue="all-clients" disabled={scope !== "global"}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-clients">All Clients</SelectItem>
                <SelectItem value="active">Active Clients</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
