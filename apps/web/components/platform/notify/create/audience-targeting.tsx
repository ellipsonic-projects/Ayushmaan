"use client";

import { useState } from "react";
import { Search, X, Plus } from "lucide-react";

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

const initialTenants = ["Global Health Clinic", "City Medical Center"];

export function AudienceTargeting() {
  const [tenants, setTenants] = useState(initialTenants);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2. Audience Targeting
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Target Tenants
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search clinics or hospital groups..." className="h-9 pl-9" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {tenants.map((tenant) => (
              <Badge key={tenant} variant="secondary" className="gap-1 py-1">
                {tenant}
                <button
                  type="button"
                  onClick={() =>
                    setTenants((prev) => prev.filter((t) => t !== tenant))
                  }
                  className="ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              <Plus className="h-3.5 w-3.5" />
              Add All Active Tenants
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Consultant Roles
            </Label>
            <Select defaultValue="all-roles">
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
            <Select defaultValue="all-clients">
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
