import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResourceCard({
  tag,
  illustration,
  title,
  description,
  ctaLabel,
}: {
  tag: "Feature" | "Story";
  illustration: ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  return (
    <Card size="sm" className="overflow-hidden py-0">
      {illustration}
      <CardContent className="flex flex-col gap-1.5 py-3">
        <Badge variant="outline" className="w-fit text-muted-foreground">
          {tag}
        </Badge>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <button
          type="button"
          className="mt-1 w-fit text-sm font-medium text-primary hover:underline"
        >
          {ctaLabel}
        </button>
      </CardContent>
    </Card>
  );
}
