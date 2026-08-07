"use client";

import { useEffect, useState } from "react";

import { WorkflowsBoard } from "@/components/tenant/shared/workflows/workflows-board";
import { listPlatformWorkflows } from "@/lib/api/workflows.client";
import type { WorkflowListItem } from "@/lib/api/workflows.server";

// Top-level "Workflows" section for SUPER_ADMIN — authors a COMMUNITY
// workflow with tenant_id null (Workflow.tenantId is nullable specifically
// for this), so there's no tenant to pick — it's created and immediately
// usable from every tenant, via /api/platform/workflows.
export default function SuperAdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlatformWorkflows().then((data) => {
      if (!cancelled) setWorkflows(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!workflows) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return <WorkflowsBoard initialWorkflows={workflows} viewerRole="SUPER_ADMIN" tenant="platform" />;
}
