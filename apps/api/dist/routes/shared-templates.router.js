"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseSharedTemplatesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const callerProfile_1 = require("../lib/callerProfile");
const workflow_context_1 = require("../lib/workflow-context");
const template_render_service_1 = require("../services/template-render.service");
const template_header_1 = require("../lib/template-header");
// Mounted at /api/tenants/:tenantId/cases/:caseId/shared-templates. Creation
// is a manual CONSULTANT action (share a message/form template into a
// case's documentation); workflow-node-handlers.ts's sendViaTemplate creates
// the same kind of row automatically whenever a workflow sends a message
// template to a client. This router only lists + creates — no edit, since
// every row is an immutable point-in-time snapshot (see schema.prisma).
exports.caseSharedTemplatesRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseSharedTemplatesRouter.use(require_tenant_match_1.requireTenantMatch);
// Same shape as case-documents.router.ts's loadCaseForDocuments /
// form-submissions.router.ts's loadCaseForFormSubmissions.
async function loadCaseForSharedTemplates(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    if (req.user.role === "TENANT_ADMIN")
        return found;
    if (req.user.role === "SUPER_ADMIN")
        return found;
    const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
    if (clientId !== found.clientId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
    }
    return found;
}
// GET /tenants/:tenantId/cases/:caseId/shared-templates
exports.caseSharedTemplatesRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const shares = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForSharedTemplates(tx, req);
        return tx.sharedTemplate.findMany({
            where: { caseId: caseRow.id },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: shares });
});
const createSchema = zod_1.z
    .union([
    zod_1.z.object({ workflowTemplateId: zod_1.z.string().uuid() }).strict(),
    zod_1.z.object({ formTemplateId: zod_1.z.string().uuid() }).strict(),
])
    .describe("Exactly one of workflowTemplateId or formTemplateId");
// POST /tenants/:tenantId/cases/:caseId/shared-templates — owning CONSULTANT
// only. Renders the template's current content against the case's merge
// fields and stores that as an immutable snapshot, same rendering path
// workflow sends use (template-render.service.ts).
exports.caseSharedTemplatesRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        const context = await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id);
        const header = (0, template_header_1.buildTemplateHeader)(context);
        if ("workflowTemplateId" in body) {
            const template = await tx.workflowTemplate.findUnique({
                where: { id: body.workflowTemplateId },
            });
            if (!template || template.deletedAt) {
                throw new errorHandler_1.AppError(404, "Template not found", "WORKFLOW_TEMPLATE_NOT_FOUND");
            }
            return tx.sharedTemplate.create({
                data: {
                    tenantId: req.params.tenantId,
                    caseId: caseRow.id,
                    workflowTemplateId: template.id,
                    templateName: template.name,
                    channel: template.channel,
                    renderedContent: {
                        subject: template.subject,
                        html: (0, template_header_1.renderTemplateHeaderHtml)(header) +
                            (0, template_render_service_1.renderTemplate)(template.content, context, "EMAIL"),
                        text: (0, template_header_1.renderTemplateHeaderText)(header) +
                            (0, template_render_service_1.renderTemplate)(template.content, context, template.channel),
                    },
                },
            });
        }
        const template = await tx.formTemplate.findUnique({ where: { id: body.formTemplateId } });
        if (!template || template.deletedAt) {
            throw new errorHandler_1.AppError(404, "Template not found", "FORM_TEMPLATE_NOT_FOUND");
        }
        return tx.sharedTemplate.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                formTemplateId: template.id,
                templateName: template.name,
                renderedContent: {
                    header: header,
                    jsonSchema: template.jsonSchema,
                    uiSchema: template.uiSchema,
                },
            },
        });
    });
    res.status(201).json({ data: created });
});
//# sourceMappingURL=shared-templates.router.js.map