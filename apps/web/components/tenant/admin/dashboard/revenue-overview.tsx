import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const weeklyRevenue = [
  { day: "Mon", value: 45 },
  { day: "Tue", value: 60 },
  { day: "Wed", value: 38 },
  { day: "Thu", value: 72 },
  { day: "Fri", value: 90 },
  { day: "Sat", value: 65 },
  { day: "Sun", value: 30 },
];

export function RevenueOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Consultation earnings, last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-3">
          {weeklyRevenue.map((day) => (
            <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
              <span
                className="w-full rounded-md bg-primary/80"
                style={{ height: `${day.value}%` }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
