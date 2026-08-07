"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import { supabase } from "@/lib/supabase/client";
import type {
  CaseCommitment,
  CaseDetailData,
  CaseDocument,
  CaseInteraction,
  CaseSession,
  CaseTask,
  InteractionType,
} from "@/lib/api/case-detail.server";

// POST /cases — a CONSULTANT opening a new case directly (not the
// PENDING_ASSIGNMENT booking-request flow at POST /cases/request). The API
// forces consultantId to the caller's own profile for this role.
export async function createCase(input: {
  clientId: string;
  category: string;
  matterKey?: string;
  requirementsSubject?: string;
  requirements?: string;
}): Promise<{ id: string }> {
  const { data } = await authedFetch(`/cases`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function createInteraction(
  caseId: string,
  input: {
    type: InteractionType;
    notes: string;
    isClientVisible?: boolean;
    appointmentId?: string;
    audioStoragePath?: string;
    transcriptionStatus?: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  }
): Promise<CaseInteraction> {
  const { data } = await authedFetch(`/cases/${caseId}/interactions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function createCommitment(
  caseId: string,
  input: {
    title: string;
    description?: string;
    dueAt?: string;
    interactionId?: string;
    appointmentId?: string;
  }
): Promise<CaseCommitment> {
  const { data } = await authedFetch(`/cases/${caseId}/commitments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function createTask(
  caseId: string,
  input: { title: string; dueAt?: string; interactionId?: string; appointmentId?: string }
): Promise<CaseTask> {
  const { data } = await authedFetch(`/cases/${caseId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

// POST /cases/:caseId/appointments — books a follow-up session directly on
// an existing case (same route the client-side booking flow uses); conflict
// and out-of-office checks happen server-side in booking.service.ts.
export async function bookFollowUpAppointment(
  caseId: string,
  input: { scheduledStart: string; scheduledEnd: string; meetingLink?: string }
): Promise<CaseSession> {
  const { data } = await authedFetch(`/cases/${caseId}/appointments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateCaseRequirements(caseId: string, requirements: string): Promise<void> {
  await authedFetch(`/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify({ requirements }),
  });
}

export async function updateCaseTags(caseId: string, tags: string[]): Promise<void> {
  await authedFetch(`/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify({ tags }),
  });
}

export async function updateCaseStatus(caseId: string, status: "ACTIVE" | "CLOSED"): Promise<void> {
  await authedFetch(`/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface OwnCaseSummary {
  id: string;
  matterKey: string | null;
  category: string;
  client: { fullName: string };
}

// Used by the quick-capture widget to let a consultant pick which case a
// between-session note belongs to, from anywhere in the dashboard.
export async function listOwnCases(): Promise<OwnCaseSummary[]> {
  const { data } = await authedFetch(`/cases`, { method: "GET" });
  return data;
}

// Client-side counterpart to case-detail.server.ts's getCaseDetail — used by
// the AI Scribe overlay, which (unlike the case detail page) runs entirely
// client-side and needs to (re)load a case's logged items after each capture.
export async function getCaseDetail(caseId: string): Promise<CaseDetailData | null> {
  try {
    const { data } = await authedFetch(`/cases/${caseId}`, { method: "GET" });
    return data;
  } catch {
    return null;
  }
}

export async function reassignCase(
  caseId: string,
  input: { consultantId: string; reason?: string }
): Promise<CaseDetailData> {
  const { data } = await authedFetch(`/cases/${caseId}/reassign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

// POST /cases/:caseId/assign-consultant — a CONSULTANT calling this claims an
// unassigned, matching-field booking request for themselves ("Take" in the
// claimable-requests queue). No consultantId in the body — the API forces it
// to the caller's own profile.
export async function claimCase(caseId: string): Promise<void> {
  await authedFetch(`/cases/${caseId}/assign-consultant`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// Sprint 4.3 — 3-step document upload: request a signed Storage upload URL,
// PUT the file directly to Storage using it, then create the metadata row.
export async function requestDocumentUploadUrl(
  caseId: string,
  fileName: string
): Promise<{ path: string; signedUrl: string; token: string }> {
  const { data } = await authedFetch(`/cases/${caseId}/documents/upload-url`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });
  return data;
}

export async function uploadCaseDocumentFile(path: string, token: string, file: File) {
  const { error } = await supabase.storage
    .from("case-documents")
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
}

export async function createDocument(
  caseId: string,
  input: {
    fileName: string;
    storagePath: string;
    isClientVisible?: boolean;
    appointmentId?: string;
  }
): Promise<CaseDocument> {
  const { data } = await authedFetch(`/cases/${caseId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function getDocumentDownloadUrl(caseId: string, documentId: string): Promise<string> {
  const { data } = await authedFetch(`/cases/${caseId}/documents/${documentId}/download-url`, {
    method: "GET",
  });
  return data.url;
}

// Sprint 4.5 — wires only the entry point for a cross-consultant referral;
// the accept/decline inbox ships in Phase 6.
export async function referToColleague(
  caseId: string,
  input: { toConsultantId: string; contextNote?: string }
): Promise<{ id: string; status: string }> {
  const { data } = await authedFetch(`/cases/${caseId}/refer`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}
