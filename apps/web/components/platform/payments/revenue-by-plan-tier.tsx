import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";

const tiers: { label: string; amount: string; percent: number; barClass: string; dotClass: string }[] = [
  {
    label: "Enterprise ($280k)",
    amount: "65%",
    percent: 65,
    barClass: "bg-foreground",
    dotClass: "bg-foreground",
  },
  {
    label: "Professional ($110k)",
    amount: "26%",
    percent: 26,
    barClass: "bg-primary",
    dotClass: "bg-primary",
  },
  {
    label: "Basic ($38.5k)",
    amount: "9%",
    percent: 9,
    barClass: "bg-muted-foreground/40",
    dotClass: "bg-muted-foreground/40",
  },
];

export function RevenueByPlanTier() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Revenue by Plan Tier</CardTitle>
        <CardAction>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {tiers.map((tier) => (
              <span key={tier.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${tier.dotClass}`} />
                {tier.label.split(" (")[0]}
              </span>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {tiers.map((tier) => (
          <div key={tier.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{tier.label}</span>
              <span className="text-muted-foreground">{tier.amount}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${tier.barClass}`}
                style={{ width: `${tier.percent}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
