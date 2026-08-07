import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import type {
  TemplateChannel,
  TemplateModerationStatus,
} from "@/lib/api/workflow-templates.server";

export interface CommunityTemplateModerationRow {
  id: string;
  tenantId: string;
  name: string;
  channel: TemplateChannel;
  status: TemplateModerationStatus;
  subject: string | null;
  content: Record<string, unknown>;
  updatedAt: string;
  consultant: { fullName: string } | null;
  tenant: { displayName: string } | null;
}

// Sprint 5.5.5 item 5 — the Super Admin review queue for COMMUNITY-scope
// templates (workflow-templates.router.ts's platformWorkflowTemplateModerationRouter).
export function useCommunityTemplateModeration(status: TemplateModerationStatus = "PENDING") {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ data: CommunityTemplateModerationRow[] }>(
    token ? `/api/platform/workflow-templates?status=${status}` : null,
    (url: string) => api.get(url, token!)
  );

  async function setStatus(templateId: string, next: "APPROVED" | "REJECTED") {
    await api.patch(`/api/platform/workflow-templates/${templateId}`, { status: next }, token!);
    mutate((current) => current && { data: current.data.filter((row) => row.id !== templateId) }, {
      revalidate: false,
    });
  }

  return {
    templates: data?.data ?? [],
    isLoading,
    error,
    approve: (id: string) => setStatus(id, "APPROVED"),
    reject: (id: string) => setStatus(id, "REJECTED"),
  };
}
