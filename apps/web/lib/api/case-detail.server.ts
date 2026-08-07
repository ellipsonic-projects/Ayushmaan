import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaseStatus } from "@/lib/api/cases.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type InteractionType = "SESSION_NOTE" | "AD_HOC_NOTE" | "CALL_LOG" | "MESSAGE_LOG";
export type CommitmentDbStatus = "ACTIVE" | "COMPLETED" | "DISCONTINUED";
export type TaskDbStatus = "OPEN" | "COMPLETED" | "OVERDUE";
export type AppointmentDbStatus =
  | "REQUESTED"
  | "ADMIN_APPROVED"
  | "APPROVED"
  | "RESCHEDULE_PROPOSED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface CaseAssignment {
  id: string;
  consultantId: string;
  role: string;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  consultant: { id: string; fullName: string };
}

export interface CaseSession {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentDbStatus;
}

export interface CaseInteraction {
  id: string;
  type: InteractionType;
  notes: string;
  isClientVisible: boolean;
  appointmentId: string | null;
  audioStoragePath: string | null;
  transcriptionStatus: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED" | null;
  createdAt: string;
}

export interface CaseCommitment {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: CommitmentDbStatus;
  interactionId: string | null;
  appointmentId: string | null;
  createdAt: string;
}

export interface CaseTask {
  id: string;
  title: string;
  dueAt: string | null;
  status: TaskDbStatus;
  assignedTo: "CLIENT" | "CONSULTANT";
  interactionId: string | null;
  appointmentId: string | null;
  createdAt: string;
}

export interface CaseDocument {
  id: string;
  fileName: string;
  isClientVisible: boolean;
  appointmentId: string | null;
  createdAt: string;
}

export interface CaseFormSubmission {
  id: string;
  status: "PENDING" | "SUBMITTED" | "EXPIRED";
  channel: "EMAIL";
  answers: Record<string, unknown>;
  submittedAt: string | null;
  createdAt: string;
  formTemplate: {
    name: string;
    jsonSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
  };
}

export interface CaseDetailData {
  id: string;
  clientId: string;
  matterKey: string | null;
  category: string;
  tags: string[];
  status: CaseStatus;
  requirements: string | null;
  createdAt: string;
  updatedAt: string;
  client: { fullName: string; user: { email: string; phone: string | null } };
  consultant: { id: string; fullName: string };
  assignments: CaseAssignment[];
  appointments: CaseSession[];
  interactions: CaseInteraction[];
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  documents: CaseDocument[];
  formSubmissions: CaseFormSubmission[];
}

async function resolveAuthedTenant() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return null;
  const { data: me } = await meRes.json();
  if (!me?.tenantId) return null;

  return {
    tenantId: me.tenantId as string,
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
  };
}

export async function getCaseDetail(caseId: string): Promise<CaseDetailData | null> {
  const resolved = await resolveAuthedTenant();
  if (!resolved) return null;

  const res = await fetch(`${API_BASE_URL}/api/tenants/${resolved.tenantId}/cases/${caseId}`, {
    headers: resolved.headers,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data as CaseDetailData;
}
