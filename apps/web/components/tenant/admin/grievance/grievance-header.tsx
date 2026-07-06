import { ChevronRight, Megaphone } from "lucide-react";
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
      <div className="mt-2 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Escalate to Platform
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Raise a billing, platform, or policy concern directly with
            Ayushman&apos;s Super Admin team. This goes straight to the
            platform, separate from your own tenant&apos;s dispute queue.
          </p>
        </div>
      </div>
    </div>
  );
}
