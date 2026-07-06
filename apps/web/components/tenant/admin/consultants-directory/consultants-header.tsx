import Link from "next/link";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ConsultantsHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Consultants</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite, review, and manage the professionals practicing under your
          tenant.
        </p>
      </div>
      <Link href="/slug/onboarding" className="shrink-0">
        <Button className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Invite Consultant
        </Button>
      </Link>
    </div>
  );
}
