import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="mt-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}
