import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/tenant/shared/templates/template-editor";
import { getOwnWorkflowTemplate } from "@/lib/api/workflow-templates.server";

export default async function ConsultantEditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const result = await getOwnWorkflowTemplate(templateId);
  if (!result) notFound();

  return <TemplateEditor initialTemplate={result.template} />;
}
