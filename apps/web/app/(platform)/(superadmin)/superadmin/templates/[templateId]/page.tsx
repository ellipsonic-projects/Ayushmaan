"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { TemplateEditor } from "@/components/tenant/shared/templates/template-editor";
import { getPlatformWorkflowTemplate } from "@/lib/api/workflow-templates.client";
import type { WorkflowTemplate } from "@/lib/api/workflow-templates.server";

// Reached from /superadmin/templates — no tenant involved at all, this
// template's tenant_id is null.
export default function SuperAdminEditTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlatformWorkflowTemplate(templateId)
      .then((data) => {
        if (!cancelled) setTemplate(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t load this template.
      </p>
    );
  }

  if (!template) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  return <TemplateEditor initialTemplate={template} viewerRole="SUPER_ADMIN" tenant="platform" />;
}
