import { notFound } from "next/navigation";
import { FormTemplateEditor } from "@/components/tenant/shared/forms/form-template-editor";
import { getOwnFormTemplate } from "@/lib/api/form-templates.server";

export default async function ConsultantEditFormTemplatePage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const result = await getOwnFormTemplate(formId);
  if (!result) notFound();

  return <FormTemplateEditor template={result.template} />;
}
