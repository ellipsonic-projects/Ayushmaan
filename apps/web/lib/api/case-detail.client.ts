"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  CaseCommitment,
  CaseDetailData,
  CaseInteraction,
  CaseTask,
  InteractionType,
} from "@/lib/api/case-detail.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authedFetch(path: string, init: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      "X-Tenant-Slug": me.tenant.slug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function createInteraction(
  caseId: string,
  input: { type: InteractionType; notes: string; isClientVisible?: boolean }
): Promise<CaseInteraction> {
  const { data } = await authedFetch(`/cases/${caseId}/interactions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function createCommitment(
  caseId: string,
  input: { title: string; description?: string; dueAt?: string }
): Promise<CaseCommitment> {
  const { data } = await authedFetch(`/cases/${caseId}/commitments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function createTask(
  caseId: string,
  input: { title: string; dueAt?: string }
): Promise<CaseTask> {
  const { data } = await authedFetch(`/cases/${caseId}/tasks`, {
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
