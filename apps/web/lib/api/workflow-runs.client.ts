"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import type { WorkflowRun } from "@/lib/api/workflow-runs.server";

// Sprint 5.5.5 item 3 — manual retry, surfaced directly from the runs list.
export async function retryWorkflowRun(workflowId: string, runId: string): Promise<WorkflowRun> {
  const { data } = await authedFetch(`/workflows/${workflowId}/runs/${runId}/retry`, {
    method: "POST",
  });
  return data;
}
