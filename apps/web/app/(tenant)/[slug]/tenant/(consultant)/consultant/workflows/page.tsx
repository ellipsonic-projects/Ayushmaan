import { WorkflowsBoard } from "@/components/tenant/shared/workflows/workflows-board";
import { getOwnWorkflows } from "@/lib/api/workflows.server";

export default async function ConsultantWorkflowsPage() {
  const result = await getOwnWorkflows();

  return (
    <div data-tour="consultant-workflows-board">
      <WorkflowsBoard initialWorkflows={result?.workflows ?? []} />
    </div>
  );
}
