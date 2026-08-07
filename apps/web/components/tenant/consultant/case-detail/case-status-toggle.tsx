"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { updateCaseStatus } from "@/lib/api/case-detail.client";
import type { CaseStatus } from "@/lib/api/cases.server";

// Sprint 4.1 scope: a case only moves between ACTIVE and CLOSED here.
export function CaseStatusToggle({ caseId, status }: { caseId: string; status: CaseStatus }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (status !== "ACTIVE" && status !== "CLOSED") return null;

  const next = status === "ACTIVE" ? "CLOSED" : "ACTIVE";

  async function handleToggle() {
    setSaving(true);
    try {
      await updateCaseStatus(caseId, next);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="w-full" onClick={handleToggle} disabled={saving}>
      {status === "ACTIVE" ? "Close case" : "Reopen case"}
    </Button>
  );
}
