// Organization/Consultant contact block prepended to every template a
// consultant sends or shares (template-render.service.ts for message
// templates, form-submissions.router.ts / shared-templates.router.ts for
// form templates) — organizationName/contactNumber/tenantAddress come from
// Tenant, adminEmail/adminPhone from the tenant's TENANT_ADMIN user,
// consultantName from ConsultantProfile.
import { escapeHtml } from "./email-layout";

export interface TemplateHeaderInfo {
  organizationName: string;
  consultantName: string;
  contactNumber: string;
  tenantAddress: string;
  adminEmail: string;
  adminPhone: string;
}

const HEADER_STYLE =
  "margin:0 0 24px;padding:16px 20px;background-color:#0f2044;border-radius:6px;" +
  "color:#ffffff;font-weight:700;font-size:13px;line-height:1.6;";

export function renderTemplateHeaderHtml(header: TemplateHeaderInfo): string {
  return (
    `<div style="${HEADER_STYLE}">` +
    `<p style="margin:0 0 4px;font-size:15px;">${escapeHtml(header.organizationName)}</p>` +
    `<p style="margin:0 0 2px;">${escapeHtml(header.tenantAddress)}</p>` +
    `<p style="margin:0 0 2px;">${escapeHtml(header.consultantName)}</p>` +
    `<p style="margin:0 0 2px;">${escapeHtml(header.contactNumber)}</p>` +
    `<p style="margin:0;">${escapeHtml(header.adminPhone)} · ${escapeHtml(header.adminEmail)}</p>` +
    `</div>`
  );
}

export function renderTemplateHeaderText(header: TemplateHeaderInfo): string {
  return (
    `${header.organizationName}\n` +
    `${header.tenantAddress}\n` +
    `${header.consultantName}\n` +
    `${header.contactNumber}\n` +
    `${header.adminPhone} · ${header.adminEmail}\n\n`
  );
}

// Reads the organization.*/consultant.* shape buildCaseContext (workflow-context.ts)
// puts on every workflow_runs.context — the same source SEND_* handlers and
// shared-templates.router.ts already build their merge-field context from.
export function buildTemplateHeader(context: Record<string, unknown>): TemplateHeaderInfo {
  const organization = context.organization as
    | { name?: string; phone?: string; address?: string; adminEmail?: string; adminPhone?: string }
    | undefined;
  const consultant = context.consultant as { name?: string } | undefined;
  return {
    organizationName: organization?.name ?? "",
    consultantName: consultant?.name ?? "",
    contactNumber: organization?.phone ?? "",
    tenantAddress: organization?.address ?? "",
    adminEmail: organization?.adminEmail ?? "",
    adminPhone: organization?.adminPhone ?? "",
  };
}
