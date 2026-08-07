"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadCaseTimelinePdf } from "@/lib/pdf/case-timeline-pdf";
import type { CaseDetailData } from "@/lib/api/case-detail.server";

export function CaseTimelineExportButton({ caseDetail }: { caseDetail: CaseDetailData }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadCaseTimelinePdf(caseDetail);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export timeline
    </Button>
  );
}
