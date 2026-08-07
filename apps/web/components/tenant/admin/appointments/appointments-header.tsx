"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export function AppointmentsHeader({ pendingCount }: { pendingCount: number }) {
  const slug = useTenantSlug();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pending Appointments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingCount === 0
            ? "Nothing awaiting your review."
            : `${pendingCount} appointment${pendingCount === 1 ? "" : "s"} awaiting approval, reschedule, or rejection.`}
        </p>
      </div>
      <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
        <Link href={`/${slug}/tenant/admin/appointments/new`}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Link>
      </Button>
    </div>
  );
}
