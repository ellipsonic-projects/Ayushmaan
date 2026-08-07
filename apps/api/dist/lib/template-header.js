"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplateHeaderHtml = renderTemplateHeaderHtml;
exports.renderTemplateHeaderText = renderTemplateHeaderText;
exports.buildTemplateHeader = buildTemplateHeader;
// Organization/Consultant contact block prepended to every template a
// consultant sends or shares (template-render.service.ts for message
// templates, form-submissions.router.ts / shared-templates.router.ts for
// form templates) — organizationName/contactNumber/tenantAddress come from
// Tenant, adminEmail/adminPhone from the tenant's TENANT_ADMIN user,
// consultantName from ConsultantProfile.
const email_layout_1 = require("./email-layout");
const HEADER_STYLE = "margin:0 0 24px;padding:16px 20px;background-color:#0f2044;border-radius:6px;" +
    "color:#ffffff;font-weight:700;font-size:13px;line-height:1.6;";
function renderTemplateHeaderHtml(header) {
    return (`<div style="${HEADER_STYLE}">` +
        `<p style="margin:0 0 4px;font-size:15px;">${(0, email_layout_1.escapeHtml)(header.organizationName)}</p>` +
        `<p style="margin:0 0 2px;">${(0, email_layout_1.escapeHtml)(header.tenantAddress)}</p>` +
        `<p style="margin:0 0 2px;">${(0, email_layout_1.escapeHtml)(header.consultantName)}</p>` +
        `<p style="margin:0 0 2px;">${(0, email_layout_1.escapeHtml)(header.contactNumber)}</p>` +
        `<p style="margin:0;">${(0, email_layout_1.escapeHtml)(header.adminPhone)} · ${(0, email_layout_1.escapeHtml)(header.adminEmail)}</p>` +
        `</div>`);
}
function renderTemplateHeaderText(header) {
    return (`${header.organizationName}\n` +
        `${header.tenantAddress}\n` +
        `${header.consultantName}\n` +
        `${header.contactNumber}\n` +
        `${header.adminPhone} · ${header.adminEmail}\n\n`);
}
// Reads the organization.*/consultant.* shape buildCaseContext (workflow-context.ts)
// puts on every workflow_runs.context — the same source SEND_* handlers and
// shared-templates.router.ts already build their merge-field context from.
function buildTemplateHeader(context) {
    const organization = context.organization;
    const consultant = context.consultant;
    return {
        organizationName: organization?.name ?? "",
        consultantName: consultant?.name ?? "",
        contactNumber: organization?.phone ?? "",
        tenantAddress: organization?.address ?? "",
        adminEmail: organization?.adminEmail ?? "",
        adminPhone: organization?.adminPhone ?? "",
    };
}
//# sourceMappingURL=template-header.js.map