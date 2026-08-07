"use client";

import { TemplateEditor } from "@/components/tenant/shared/templates/template-editor";

// Reached from /superadmin/templates — no tenant involved at all, this
// template's tenant_id is null.
export default function SuperAdminNewTemplatePage() {
  return <TemplateEditor viewerRole="SUPER_ADMIN" tenant="platform" />;
}
