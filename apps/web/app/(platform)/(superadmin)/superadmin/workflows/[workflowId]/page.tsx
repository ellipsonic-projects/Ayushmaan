"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { WorkflowCanvas } from "@/components/tenant/shared/workflows/workflow-canvas";
import { getPlatformWorkflow } from "@/lib/api/workflows.client";
import type { Workflow } from "@/lib/api/workflows.server";

// Reached from /superadmin/workflows — no tenant involved at all, this
// workflow's tenant_id is null.
export default function SuperAdminWorkflowCanvasPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlatformWorkflow(workflowId)
      .then((data) => {
        if (!cancelled) setWorkflow(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t load this workflow.
      </p>
    );
  }

  if (!workflow) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return <WorkflowCanvas workflow={workflow} viewerRole="SUPER_ADMIN" tenant="platform" />;
}
