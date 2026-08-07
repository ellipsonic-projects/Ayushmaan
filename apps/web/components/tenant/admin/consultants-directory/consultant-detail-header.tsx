"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useTenantSlug } from "@/lib/tenant/slug-context";

const statusBadgeClass: Record<string, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  SUSPENDED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export function ConsultantDetailHeader({
  fullName,
  consultantId,
  accountStatus,
}: {
  fullName: string;
  consultantId: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
}) {
  const slug = useTenantSlug();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href={`/${slug}/tenant/admin/consultants`} className="hover:text-foreground">
            Consultants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{fullName}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
          <Badge variant="outline" className={statusBadgeClass[accountStatus]}>
            {accountStatus}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">ID: {consultantId}</p>
      </div>
    </div>
  );
}
