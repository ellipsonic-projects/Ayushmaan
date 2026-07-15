import Link from "next/link";
import { Briefcase, ChevronRight, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function TenantDetailStatsRow({
  tenantId,
  consultantCount,
  clientCount,
}: {
  tenantId: string;
  consultantCount: number;
  clientCount: number;
}) {
  const stats: {
    label: string;
    value: string;
    sub: string;
    icon: LucideIcon;
    action: string;
    href: string;
  }[] = [
    {
      label: "Consultants",
      value: String(consultantCount),
      sub: "Active",
      icon: Briefcase,
      action: "View All",
      href: `/tenants/${tenantId}/consultants`,
    },
    {
      label: "Clients",
      value: String(clientCount),
      sub: "Total",
      icon: Users,
      action: "View All",
      href: `/tenants/${tenantId}/clients`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {stats.map(({ label, value, sub, icon: Icon, action, href }) => (
        <Card key={label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {value} <span className="text-xs font-normal text-muted-foreground">{sub}</span>
                </p>
              </div>
            </div>
            <Link
              href={href}
              className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              {action}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
