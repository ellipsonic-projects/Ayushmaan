"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import { supabase } from "@/lib/supabase/client";

export interface UpdateAppointmentBody {
  status?:
    "ADMIN_APPROVED" | "APPROVED" | "RESCHEDULE_PROPOSED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  cancellationReason?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export async function updateAppointment(appointmentId: string, body: UpdateAppointmentBody) {
  await authedFetch(`/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// POST /appointment-series/:seriesId/approve — Sprint 3.4 series-level action.
// TENANT_ADMIN admin-approves every REQUESTED occurrence; CONSULTANT accepts
// every ADMIN_APPROVED occurrence — one call instead of one per occurrence.
export async function approveSeries(seriesId: string): Promise<{ updatedCount: number }> {
  const { data } = await authedFetch(`/appointment-series/${seriesId}/approve`, {
    method: "POST",
  });
  return data as { updatedCount: number };
}

export async function createAppointmentForClient(
  caseId: string,
  body: { scheduledStart: string; scheduledEnd: string; meetingLink?: string }
) {
  return authedFetch(`/cases/${caseId}/appointments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createClient(body: { email: string; fullName: string; phone: string }) {
  const { data } = await authedFetch(`/clients`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as { id: string; clientProfile: { id: string; fullName: string } };
}

// POST /cases/request — TENANT_ADMIN entering a booking request for a client
// who called in. No consultant is chosen here (no manual matching, same rule
// as the client self-service flow): this opens a PENDING_ASSIGNMENT case plus
// a REQUESTED appointment, which the admin approves and a matching
// consultant later claims from their queue.
export async function requestCaseForClient(body: {
  clientId: string;
  category: string;
  requirementsSubject?: string;
  requirements?: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingLink?: string;
}) {
  const { data } = await authedFetch(`/cases/request`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as { case: { id: string }; appointment: { id: string } };
}

// 3-step upload (mirrors client-documents.client.ts), used when a
// TENANT_ADMIN attaches a document to a case while booking on a client's
// behalf. authedFetch resolves the caller's own tenant, so no
// tenantId/tenantSlug params are needed here.
export async function requestAdminDocumentUploadUrl(
  caseId: string,
  fileName: string
): Promise<{ path: string; signedUrl: string; token: string }> {
  const { data } = await authedFetch(`/cases/${caseId}/documents/upload-url`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });
  return data;
}

export async function uploadAdminDocumentFile(path: string, token: string, file: File) {
  const { error } = await supabase.storage
    .from("case-documents")
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
}

export async function createAdminDocument(
  caseId: string,
  input: { fileName: string; storagePath: string }
) {
  const { data } = await authedFetch(`/cases/${caseId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function getAdminDocumentDownloadUrl(
  caseId: string,
  documentId: string
): Promise<string> {
  const { data } = await authedFetch(`/cases/${caseId}/documents/${documentId}/download-url`, {
    method: "GET",
  });
  return data.url;
}
