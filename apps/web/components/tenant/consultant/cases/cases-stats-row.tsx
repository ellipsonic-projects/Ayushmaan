import { Card, CardContent } from "@/components/ui/card";
import { cases } from "@/components/tenant/consultant/cases/cases-data";

export function CasesStatsRow() {
  const total = cases.length;
  const open = cases.filter((c) => c.status === "Open").length;
  const onHold = cases.filter((c) => c.status === "On Hold").length;
  const closed = cases.filter((c) => c.status === "Closed").length;

  const stats = [
    { label: "Total Cases", value: String(total) },
    { label: "Open", value: String(open), valueClass: "text-emerald-600 dark:text-emerald-500" },
    { label: "On Hold", value: String(onHold), valueClass: "text-amber-600 dark:text-amber-500" },
    { label: "Closed", value: String(closed), valueClass: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map(({ label, value, valueClass }) => (
        <Card key={label} size="sm">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums text-foreground ${valueClass ?? ""}`}>
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
