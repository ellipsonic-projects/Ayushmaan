import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Shrinks to zero width/opacity when the ancestor sidebar is collapsed.
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
          "max-w-40 overflow-hidden whitespace-nowrap opacity-100 transition-all duration-200 group-data-[collapsed=true]:max-w-0 group-data-[collapsed=true]:opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
