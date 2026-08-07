"use client";

import { useEffect, useState } from "react";

import { TemplatesBoard } from "@/components/tenant/shared/templates/templates-board";
import { listPlatformWorkflowTemplates } from "@/lib/api/workflow-templates.client";
import type { WorkflowTemplate } from "@/lib/api/workflow-templates.server";

// Top-level "Templates" section for SUPER_ADMIN — authors a COMMUNITY
// message template with tenant_id null (WorkflowTemplate.tenantId is
// nullable specifically for this), so there's no tenant to pick — it's
// created and immediately visible from every tenant, via
// /api/platform/workflow-templates.
export default function SuperAdminTemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlatformWorkflowTemplates().then((data) => {
      if (!cancelled) setTemplates(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!templates) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div data-tour="superadmin-templates-board">
      <TemplatesBoard
        initialTemplates={templates}
        initialFormTemplates={[]}
        viewerRole="SUPER_ADMIN"
        tenant="platform"
      />
    </div>
  );
}
