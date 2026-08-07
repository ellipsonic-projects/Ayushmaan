import { TemplatesBoard } from "@/components/tenant/shared/templates/templates-board";
import { getOwnWorkflowTemplates } from "@/lib/api/workflow-templates.server";
import { getOwnFormTemplates } from "@/lib/api/form-templates.server";

export default async function ConsultantTemplatesPage() {
  const [messageResult, formResult] = await Promise.all([
    getOwnWorkflowTemplates(),
    getOwnFormTemplates(),
  ]);

  return (
    <div data-tour="consultant-templates-board">
      <TemplatesBoard
        initialTemplates={messageResult?.templates ?? []}
        initialFormTemplates={formResult?.templates ?? []}
      />
    </div>
  );
}
