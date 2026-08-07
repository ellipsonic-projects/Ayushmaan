"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HelpBanner() {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Info className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm text-foreground">
          Your workspace is ready. Explore what you can do next.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowChecklist((v) => !v)}
      >
        {showChecklist ? "Hide checklist" : "Show checklist"}
      </Button>
    </div>
  );
}
