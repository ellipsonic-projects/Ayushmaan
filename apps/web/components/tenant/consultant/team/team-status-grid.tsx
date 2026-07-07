import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Available" | "In Session" | "On Leave";

const consultants: { name: string; specialty: string; status: Status }[] = [
  { name: "Dr. Amit Shah", specialty: "Cardiology", status: "In Session" },
  { name: "Dr. Meera Iyer", specialty: "Dermatology", status: "Available" },
  { name: "Dr. Karan Walia", specialty: "Psychiatry", status: "In Session" },
  { name: "Dr. Priya Nair", specialty: "Pediatrics", status: "On Leave" },
  { name: "Dr. Rohan Deshmukh", specialty: "Orthopedics", status: "Available" },
  { name: "Dr. Sneha Kulkarni", specialty: "Gynecology", status: "Available" },
  { name: "Dr. Vikram Reddy", specialty: "Neurology", status: "In Session" },
  { name: "Dr. Ananya Bose", specialty: "General Medicine", status: "On Leave" },
  { name: "Dr. Farhan Qureshi", specialty: "ENT", status: "Available" },
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

export function TeamStatusGrid() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{consultants.length} Consultants</Badge>
        <Badge variant="outline" className="text-emerald-600">
          {consultants.filter((c) => c.status === "Available").length} Available
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {consultants.map((c) => (
          <Card key={c.name}>
            <CardContent className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {initials(c.name)}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusClass[c.status]}`}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.specialty}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.status}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
