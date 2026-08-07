"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface QuickCaptureContextValue {
  open: boolean;
  presetCaseId: string | null;
  openWidget: (caseId?: string) => void;
  closeWidget: () => void;
}

const QuickCaptureContext = createContext<QuickCaptureContextValue | null>(null);

// Lets any page (e.g. a case-detail page's own "Quick capture" button) open
// the globally-mounted QuickCaptureWidget with a case pre-selected, without
// duplicating the widget's form logic.
export function QuickCaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [presetCaseId, setPresetCaseId] = useState<string | null>(null);

  const openWidget = useCallback((caseId?: string) => {
    setPresetCaseId(caseId ?? null);
    setOpen(true);
  }, []);
  const closeWidget = useCallback(() => setOpen(false), []);

  return (
    <QuickCaptureContext.Provider value={{ open, presetCaseId, openWidget, closeWidget }}>
      {children}
    </QuickCaptureContext.Provider>
  );
}

export function useQuickCapture() {
  const ctx = useContext(QuickCaptureContext);
  if (!ctx) throw new Error("useQuickCapture must be used within a QuickCaptureProvider");
  return ctx;
}
