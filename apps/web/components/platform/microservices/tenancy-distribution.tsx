import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const segments = [
  { label: "Medical", value: 45, color: "#0f172a" },
  { label: "Legal", value: 25, color: "#34d399" },
  { label: "IT / Tech", value: 30, color: "#a7f3d0" },
];

function buildConicGradient() {
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    const end = cursor + segment.value;
    cursor = end;
    return `${segment.color} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function TenancyDistribution() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tenancy Distribution</CardTitle>
        <CardDescription>Composition by industry sector</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div
          className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
          style={{ background: buildConicGradient() }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-card">
            <p className="text-lg font-bold text-foreground">1.2k</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Total
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-medium text-muted-foreground">
                {segment.value}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
