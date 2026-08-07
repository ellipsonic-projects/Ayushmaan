"use client";

import { NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQuickCapture } from "@/lib/quick-capture-context";

// Opens the globally-mounted QuickCaptureWidget with this case pre-selected
// (sprint 4.5 item 2 — quick-capture directly from the case page).
export function QuickCaptureTriggerButton({ caseId }: { caseId: string }) {
  const { openWidget } = useQuickCapture();
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={() => openWidget(caseId)}>
      <NotebookPen className="h-4 w-4" />
      Quick capture
    </Button>
  );
}
