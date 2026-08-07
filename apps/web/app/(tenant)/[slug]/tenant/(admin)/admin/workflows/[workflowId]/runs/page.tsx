import { notFound } from "next/navigation";
import { WorkflowRuns } from "@/components/tenant/shared/workflows/workflow-runs";
import { getOwnWorkflow } from "@/lib/api/workflows.server";
import { getOwnWorkflowRuns } from "@/lib/api/workflow-runs.server";

export default async function TenantAdminWorkflowRunsPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  const [workflow, runs] = await Promise.all([
    getOwnWorkflow(workflowId),
    getOwnWorkflowRuns(workflowId),
  ]);
  if (!workflow) notFound();

  return (
    <WorkflowRuns
      workflowId={workflowId}
      workflowName={workflow.workflow.name}
      initialRuns={runs?.runs ?? []}
    />
  );
}
