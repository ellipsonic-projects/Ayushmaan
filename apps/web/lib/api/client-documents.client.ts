"use client";

import { authedFetchForTenant } from "@/lib/api/authed-fetch";
import { supabase } from "@/lib/supabase/client";
import type { ClientCaseDocument } from "@/lib/api/client-documents.server";

// CLIENT accounts are platform-level (no home tenant_id claim), so every
// call here takes the tenantId/tenantSlug of the specific case being acted
// on, mirroring clients.client.ts's updateOwnClientProfile.

export async function listClientCaseDocuments(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<ClientCaseDocument[]> {
  const { data } = await authedFetchForTenant(tenantId, tenantSlug, `/cases/${caseId}/documents`);
  return data;
}

// 3-step upload (mirrors case-detail.client.ts): request a signed Storage
// upload URL, PUT the file directly to Storage using it, then create the
// metadata row.
export async function requestDocumentUploadUrl(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  fileName: string
): Promise<{ path: string; signedUrl: string; token: string }> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/documents/upload-url`,
    { method: "POST", body: JSON.stringify({ fileName }) }
  );
  return data;
}

export async function uploadClientDocumentFile(path: string, token: string, file: File) {
  const { error } = await supabase.storage
    .from("case-documents")
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
}

// isClientVisible is forced true — this is the client's own upload, so it's
// always visible to them; the assigned consultant of the case can already
// see every document in their own case regardless of this flag.
export async function createClientDocument(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  // taskId links this upload to a Task of type UPLOAD_DOCUMENT — set when
  // the client is completing that task (tasks-client.tsx), so the server
  // auto-completes it.
  input: { fileName: string; storagePath: string; taskId?: string }
): Promise<ClientCaseDocument> {
  const { data } = await authedFetchForTenant(tenantId, tenantSlug, `/cases/${caseId}/documents`, {
    method: "POST",
    body: JSON.stringify({ ...input, isClientVisible: true }),
  });
  return data;
}

export async function deleteClientDocument(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  documentId: string
): Promise<void> {
  await authedFetchForTenant(tenantId, tenantSlug, `/cases/${caseId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function getClientDocumentDownloadUrl(
  tenantId: string,
  tenantSlug: string,
  caseId: string,
  documentId: string
): Promise<string> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/cases/${caseId}/documents/${documentId}/download-url`
  );
  return data.url;
}
