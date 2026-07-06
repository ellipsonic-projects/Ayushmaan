"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TenantProfileCard({
  tenantId,
  adminName,
  adminEmail,
  joinedOn,
}: {
  tenantId: string;
  adminName: string;
  adminEmail: string;
  joinedOn: string;
}) {
  const [displayName, setDisplayName] = useState("Acme Global Solutions");
  const [slug, setSlug] = useState("acme-global");
  const [customDomain, setCustomDomain] = useState("portal.acmeglobal.com");

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
              {adminName.charAt(0)}
            </span>
            <div>
              <p className="font-medium text-foreground">{adminName}</p>
              <p className="text-xs text-muted-foreground">{adminEmail}</p>
            </div>
          </div>
          <div className="flex gap-8 text-right">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tenant ID
              </p>
              <p className="text-sm font-medium text-foreground">{tenantId}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Joined On
              </p>
              <p className="text-sm font-medium text-foreground">{joinedOn}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Display Name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Slug (Subdomain)
            </Label>
            <div className="flex items-center gap-1.5">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <span className="shrink-0 text-xs text-muted-foreground">
                .platform.com
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Custom Domain
            </Label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select defaultValue="active">
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
