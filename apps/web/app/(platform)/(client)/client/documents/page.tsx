import { getOwnClientProfile } from "@/lib/api/clients.server";
import { getClientCaseDocuments, type ClientCaseDocument } from "@/lib/api/client-documents.server";
import ClientDocumentsView, { type ClientCaseOption } from "./documents-client";

export default async function ClientDocumentsPage() {
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
  await Promise.all(
    cases.map(async (c) => {
      documentsByCase[c.id] = await getClientCaseDocuments(c.tenantId, c.tenantSlug, c.id);
    })
  );

  return <ClientDocumentsView cases={cases} initialDocuments={documentsByCase} />;
}
