import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

type Status = "Available" | "On Leave" | "Suspended";

const categoryLabel: Record<string, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

function statusOf(consultant: ConsultantProfile): Status {
  if (consultant.user.accountStatus === "SUSPENDED") return "Suspended";
  return consultant.outOfOfficePeriods.length > 0 ? "On Leave" : "Available";
}

const statusClass: Record<Status, string> = {
  Available: "bg-emerald-500",
  "On Leave": "bg-muted-foreground/40",
  Suspended: "bg-destructive",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function TeamStatusGrid({ consultants }: { consultants: ConsultantProfile[] }) {
  const availableCount = consultants.filter((c) => statusOf(c) === "Available").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{consultants.length} Consultants</Badge>
        <Badge variant="outline" className="text-emerald-600">
          {availableCount} Available
        </Badge>
      </div>
      {consultants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No consultants found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {consultants.map((c) => {
            const status = statusOf(c);
            const suspended = status === "Suspended";
            return (
              <Card key={c.id} className={suspended ? "opacity-60" : undefined}>
                <CardContent className="flex items-center gap-3">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {initials(c.fullName)}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusClass[status]}`}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.subSpecialization ?? categoryLabel[c.category] ?? c.category}
                    </p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 text-xs ${suspended ? "font-medium text-destructive" : "text-muted-foreground"}`}
                  >
                    {status}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
