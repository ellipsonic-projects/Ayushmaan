import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Shrinks to zero width/opacity when the ancestor `.group` sidebar is
// collapsed, and expands back on `group-hover` — used so a hover-expand
// sidebar doesn't show clipped partial-text slivers at its collapsed width.
export function CollapsibleLabel({
  collapsible,
  className,
  children,
}: {
  collapsible: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        collapsible &&
          "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-36 group-hover:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}
