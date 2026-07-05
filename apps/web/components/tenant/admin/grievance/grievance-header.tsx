import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function GrievanceHeader() {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/slug/dashboard" className="hover:text-foreground">
          Tenant Admin
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Escalate to Platform</span>
      </div>
      <h2 className="mt-1 text-2xl font-bold text-foreground">
        Escalate to Platform
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Raise a billing, platform, or policy concern directly with Ayushman&apos;s
        Super Admin team. This goes straight to the platform, separate from
        your own tenant&apos;s dispute queue.
      </p>
    </div>
  );
}
