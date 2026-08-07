import { getTenantCases } from "@/lib/api/cases.server";
import { getOwnWorkflowTemplates } from "@/lib/api/workflow-templates.server";
import { getOwnFormTemplates } from "@/lib/api/form-templates.server";
import { getClientCaseDocuments, type ClientCaseDocument } from "@/lib/api/client-documents.server";
import {
  getClientCaseFormSubmissions,
  type ClientFormSubmission,
} from "@/lib/api/client-form-submissions.server";
import { getCaseSharedTemplates, type SharedTemplateItem } from "@/lib/api/shared-templates.server";
import { getConsultantCaseClientTasks, type ClientCaseTask } from "@/lib/api/client-tasks.server";
import ConsultantDocumentationView, { type ConsultantCaseOption } from "./documentation-client";

export default async function ConsultantDocumentationPage() {
  const [cases, messageResult, formResult] = await Promise.all([
    getTenantCases(),
    getOwnWorkflowTemplates(),
    getOwnFormTemplates(),
  ]);

  const tenantId = messageResult?.tenantId ?? formResult?.tenantId ?? null;
  const tenantSlug = messageResult?.tenantSlug ?? formResult?.tenantSlug ?? null;

  const caseOptions: ConsultantCaseOption[] =
    tenantId && tenantSlug
      ? cases.map((c) => ({
          id: c.id,
          clientName: c.client.fullName,
        }))
      : [];

  const documentsByCase: Record<string, ClientCaseDocument[]> = {};
  const formSubmissionsByCase: Record<string, ClientFormSubmission[]> = {};
  const sharedTemplatesByCase: Record<string, SharedTemplateItem[]> = {};
  const tasksByCase: Record<string, ClientCaseTask[]> = {};
  if (tenantId && tenantSlug) {
    await Promise.all(
      caseOptions.map(async (c) => {
        const [documents, formSubmissions, sharedTemplates, tasks] = await Promise.all([
          getClientCaseDocuments(tenantId, tenantSlug, c.id),
          getClientCaseFormSubmissions(tenantId, tenantSlug, c.id),
          getCaseSharedTemplates(tenantId, tenantSlug, c.id),
          getConsultantCaseClientTasks(tenantId, tenantSlug, c.id),
        ]);
        documentsByCase[c.id] = documents;
        formSubmissionsByCase[c.id] = formSubmissions;
        sharedTemplatesByCase[c.id] = sharedTemplates;
        tasksByCase[c.id] = tasks;
      })
    );
  }

  return (
    <ConsultantDocumentationView
      tenantId={tenantId}
      tenantSlug={tenantSlug}
      cases={caseOptions}
      documentsByCase={documentsByCase}
      formSubmissionsByCase={formSubmissionsByCase}
      sharedTemplatesByCase={sharedTemplatesByCase}
      tasksByCase={tasksByCase}
      messageTemplates={messageResult?.templates ?? []}
      formTemplates={formResult?.templates ?? []}
    />
  );
}
