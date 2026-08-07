import { getOwnClientProfile } from "@/lib/api/clients.server";
import { getClientCaseDocuments, type ClientCaseDocument } from "@/lib/api/client-documents.server";
import {
  getClientCaseFormSubmissions,
  type ClientFormSubmission,
} from "@/lib/api/client-form-submissions.server";
import { getCaseSharedTemplates, type SharedTemplateItem } from "@/lib/api/shared-templates.server";
import { getClientCaseTasks, type ClientCaseTask } from "@/lib/api/client-tasks.server";
import ClientDocumentationView, { type ClientCaseOption } from "./documentation-client";

export default async function ClientDocumentationPage() {
  const client = await getOwnClientProfile();
  const clientCases = client?.cases ?? [];

  const cases: ClientCaseOption[] = clientCases
    .filter((c) => c.consultant)
    .map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      tenantSlug: c.tenant.slug,
      consultantName: c.consultant!.fullName,
    }));

  const documentsByCase: Record<string, ClientCaseDocument[]> = {};
  const formSubmissionsByCase: Record<string, ClientFormSubmission[]> = {};
  const sharedTemplatesByCase: Record<string, SharedTemplateItem[]> = {};
  const tasksByCase: Record<string, ClientCaseTask[]> = {};
  await Promise.all(
    cases.map(async (c) => {
      const [documents, formSubmissions, sharedTemplates, tasks] = await Promise.all([
        getClientCaseDocuments(c.tenantId, c.tenantSlug, c.id),
        getClientCaseFormSubmissions(c.tenantId, c.tenantSlug, c.id),
        getCaseSharedTemplates(c.tenantId, c.tenantSlug, c.id),
        getClientCaseTasks(c.tenantId, c.tenantSlug, c.id),
      ]);
      documentsByCase[c.id] = documents;
      formSubmissionsByCase[c.id] = formSubmissions;
      sharedTemplatesByCase[c.id] = sharedTemplates;
      // Only tasks assigned to the client are ever returned here (enforced
      // server-side in case-tasks.router.ts) — every one of them is
      // something the consultant is waiting on the client to complete.
      tasksByCase[c.id] = tasks;
    })
  );

  return (
    <ClientDocumentationView
      cases={cases}
      documentsByCase={documentsByCase}
      formSubmissionsByCase={formSubmissionsByCase}
      sharedTemplatesByCase={sharedTemplatesByCase}
      tasksByCase={tasksByCase}
    />
  );
}
