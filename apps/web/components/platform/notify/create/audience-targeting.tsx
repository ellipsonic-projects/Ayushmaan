"use client";

import { useEffect, useState } from "react";
import { X, Plus, Globe2, UserRound } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import {
  getTenantClientsForAudience,
  type Tenant,
  type AudienceClient,
  type BroadcastScope,
  type BroadcastTargetRole,
} from "@/lib/hooks";

const scopeOptions: { id: BroadcastScope; label: string; note: string; icon: typeof Globe2 }[] = [
  {
    id: "GLOBAL",
    label: "Global Notify",
    note: "Send to tenants/consultants/clients matching the filters below",
    icon: Globe2,
  },
  {
    id: "TARGETED_CLIENT",
    label: "Targeted to One Client",
    note: "Send to a single client only",
    icon: UserRound,
  },
];

const roleOptions: { value: BroadcastTargetRole; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "TENANT_ADMIN", label: "Tenants Only" },
  { value: "CONSULTANT", label: "Consultants Only" },
  { value: "CLIENT", label: "Clients Only" },
];

const CONSULTANT_CATEGORIES = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

export function AudienceTargeting({
  scope,
  onScopeChange,
  tenants,
  targetTenantIds,
  onTargetTenantIdsChange,
  clientTenantId,
  onClientTenantIdChange,
  targetClientId,
  onTargetClientIdChange,
  targetRole,
  onTargetRoleChange,
  targetConsultantCategory,
  onTargetConsultantCategoryChange,
  targetClientSegment,
  onTargetClientSegmentChange,
}: {
  scope: BroadcastScope;
  onScopeChange: (scope: BroadcastScope) => void;
  tenants: Tenant[];
  targetTenantIds: string[];
  onTargetTenantIdsChange: (ids: string[]) => void;
  clientTenantId: string;
  onClientTenantIdChange: (id: string) => void;
  targetClientId: string;
  onTargetClientIdChange: (id: string) => void;
  targetRole: BroadcastTargetRole;
  onTargetRoleChange: (value: BroadcastTargetRole) => void;
  targetConsultantCategory: string;
  onTargetConsultantCategoryChange: (value: string) => void;
  targetClientSegment: "" | "ACTIVE" | "ON_HOLD";
  onTargetClientSegmentChange: (value: "" | "ACTIVE" | "ON_HOLD") => void;
}) {
  const [clientsForTenant, setClientsForTenant] = useState<AudienceClient[]>([]);
  const [loadedTenantId, setLoadedTenantId] = useState<string | null>(null);
  const loadingClients = !!clientTenantId && loadedTenantId !== clientTenantId;

  useEffect(() => {
    if (!clientTenantId) return;
    const tenant = tenants.find((t) => t.id === clientTenantId);
    if (!tenant) return;
    getTenantClientsForAudience(tenant.id, tenant.slug).then((clients) => {
      setClientsForTenant(clients);
      setLoadedTenantId(tenant.id);
    });
  }, [clientTenantId, tenants]);

  const effectiveClients =
    clientTenantId && loadedTenantId === clientTenantId ? clientsForTenant : [];
  const selectedTenants = tenants.filter((t) => targetTenantIds.includes(t.id));

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
              onClick={() => onScopeChange(id)}
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
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{note}</span>
              </span>
            </button>
          ))}
        </div>

        {scope === "TARGETED_CLIENT" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tenant</Label>
              <Select value={clientTenantId} onValueChange={(v) => onClientTenantIdChange(v ?? "")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Client</Label>
              <Select
                value={targetClientId}
                onValueChange={(v) => onTargetClientIdChange(v ?? "")}
                disabled={!clientTenantId || loadingClients}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue
                    placeholder={loadingClients ? "Loading clients..." : "Select a client..."}
                  />
                </SelectTrigger>
                <SelectContent>
                  {effectiveClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Target Tenants</Label>
              <div className="flex flex-wrap items-center gap-2">
                {selectedTenants.map((tenant) => (
                  <Badge key={tenant.id} variant="secondary" className="gap-1 py-1">
                    {tenant.displayName}
                    <button
                      type="button"
                      onClick={() =>
                        onTargetTenantIdsChange(targetTenantIds.filter((id) => id !== tenant.id))
                      }
                      className="ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {targetTenantIds.length < tenants.length && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-primary"
                    onClick={() => onTargetTenantIdsChange(tenants.map((t) => t.id))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add All Active Tenants
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {targetTenantIds.length === 0
                  ? "No tenants selected — this broadcast will reach every active tenant."
                  : `Reaching ${targetTenantIds.length} of ${tenants.length} active tenants.`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Target Role</Label>
              <Select
                value={targetRole}
                onValueChange={(v) => onTargetRoleChange((v ?? "ALL") as BroadcastTargetRole)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Consultant Category
                </Label>
                <Select
                  value={targetConsultantCategory || "all"}
                  onValueChange={(v) =>
                    onTargetConsultantCategoryChange(v === "all" ? "" : (v ?? ""))
                  }
                  disabled={targetRole === "TENANT_ADMIN" || targetRole === "CLIENT"}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CONSULTANT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Client Segment</Label>
                <Select
                  value={targetClientSegment || "all"}
                  onValueChange={(v) =>
                    onTargetClientSegmentChange(v === "all" ? "" : (v as "ACTIVE" | "ON_HOLD"))
                  }
                  disabled={
                    !!targetConsultantCategory ||
                    targetRole === "TENANT_ADMIN" ||
                    targetRole === "CONSULTANT"
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="ACTIVE">Active Cases</SelectItem>
                    <SelectItem value="ON_HOLD">On-Hold Cases</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
