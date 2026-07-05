import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function OnboardingHeader() {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/slug/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/slug/consultants" className="hover:text-foreground">
          Consultants
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Onboard</span>
      </div>
      <h2 className="mt-1 text-2xl font-bold text-foreground">
        Onboard a New Consultant
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create their account and professional profile. Fields marked with{" "}
        <span className="text-destructive">*</span> are required to store a
        bookable consultant record.
      </p>
    </div>
  );
}
