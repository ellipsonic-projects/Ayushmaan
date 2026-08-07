import { notFound } from "next/navigation";
import { WorkflowCanvas } from "@/components/tenant/shared/workflows/workflow-canvas";
import { getOwnWorkflow } from "@/lib/api/workflows.server";

export default async function ConsultantWorkflowCanvasPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  const result = await getOwnWorkflow(workflowId);
  if (!result) notFound();

  return <WorkflowCanvas workflow={result.workflow} />;
}
