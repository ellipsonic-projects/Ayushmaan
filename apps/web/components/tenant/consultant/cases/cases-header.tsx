"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export function CasesHeader() {
  const slug = useTenantSlug();

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Case Archive</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every case you&apos;ve worked on, open or finished — pick up where you left off.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link href={`/${slug}/tenant/consultant/cases/new`}>
          <Plus className="h-4 w-4" />
          New Case
        </Link>
      </Button>
    </div>
  );
}
