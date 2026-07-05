"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const specializations = [
  "Regulatory Compliance",
  "Privacy Law (GDPR)",
  "M&A Advisory",
  "Operational Efficiency",
];

export function ConsultantDirectoryHeader({
  tenantId,
  tenantName,
  totalConsultants,
}: {
  tenantId: string;
  tenantName: string;
  totalConsultants: number;
}) {
  const [specialization, setSpecialization] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Consultants Directory</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Tenant Consultants Directory
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing {totalConsultants.toLocaleString()} licensed professionals
          for {tenantName}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select value={specialization} onValueChange={setSpecialization}>
          <SelectTrigger className="h-8 w-full min-w-56">
            <SelectValue placeholder="Filter by Specialization" />
          </SelectTrigger>
          <SelectContent>
            {specializations.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Onboard Consultant
        </Button>
      </div>
    </div>
  );
}
