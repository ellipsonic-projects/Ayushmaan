import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Available" | "In Session" | "On Leave";

const consultants: { name: string; specialty: string; status: Status }[] = [
  { name: "Dr. Amit Shah", specialty: "Cardiology", status: "In Session" },
  { name: "Dr. Meera Iyer", specialty: "Dermatology", status: "Available" },
  { name: "Dr. Karan Walia", specialty: "Psychiatry", status: "In Session" },
  { name: "Dr. Priya Nair", specialty: "Pediatrics", status: "On Leave" },
];

const statusClass: Record<Status, string> = {
  Available: "bg-emerald-500",
  "In Session": "bg-amber-500",
  "On Leave": "bg-muted-foreground/40",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function ConsultantStatus() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Consultant Status</CardTitle>
        <CardAction>
          <Badge variant="outline">9 Total</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {consultants.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {initials(c.name)}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusClass[c.status]}`}
                />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.specialty}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{c.status}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
