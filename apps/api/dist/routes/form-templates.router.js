"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formTemplatesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
// Mounted at /api/tenants/:tenantId/form-templates. Same scope-gated
// visibility model as workflow-templates.router.ts (form_templates_scope_policy
// in supabase/policies/12-form-templates.sql is the real enforcement) — this
// router doesn't build a COMMUNITY-moderation surface the way
// workflow-templates.router.ts does, since that wasn't asked for here; a
// COMMUNITY-scoped form template simply stays PENDING (invisible to other
// tenants) until that's added.
exports.formTemplatesRouter = (0, express_1.Router)({ mergeParams: true });
exports.formTemplatesRouter.use(require_tenant_match_1.requireTenantMatch);
exports.formTemplatesRouter.use((0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));
// A JSON Schema (Draft-07) object built by the builder's field palette
// (apps/web/lib/forms/builder-schema.ts) — validated loosely here (must be an
// object schema with a properties map); the builder is the only writer, so
// deep structural validation isn't duplicated server-side.
const jsonSchemaSchema = zod_1.z
    .object({
    type: zod_1.z.literal("object"),
    properties: zod_1.z.record(zod_1.z.unknown()).default({}),
})
    .passthrough();
const uiSchemaSchema = zod_1.z.record(zod_1.z.unknown());
async function findTemplate(tx, templateId) {
    const template = await tx.formTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt) {
        throw new errorHandler_1.AppError(404, "Form template not found", "FORM_TEMPLATE_NOT_FOUND");
    }
    return template;
}
async function requireOwnTemplate(tx, userId, template) {
    const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, userId);
    if (!consultantId || consultantId !== template.consultantId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_TEMPLATE");
    }
}
function withOwnership(template, callerConsultantId) {
    return { ...template, isOwn: template.consultantId === callerConsultantId };
}
const listQuerySchema = zod_1.z.object({
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
});
// GET /tenants/:tenantId/form-templates
exports.formTemplatesRouter.get("/", async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const templates = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.formTemplate.findMany({
        where: { deletedAt: null, ...(query.scope && { scope: query.scope }) },
        include: { consultant: { select: { fullName: true } } },
        orderBy: { updatedAt: "desc" },
    }));
    const callerConsultantId = req.tenantContext.consultantId ?? null;
    res.json({ data: templates.map((t) => withOwnership(t, callerConsultantId)) });
});
// GET /tenants/:tenantId/form-templates/:templateId
exports.formTemplatesRouter.get("/:templateId", async (req, res) => {
    const template = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => findTemplate(tx, req.params.templateId));
    res.json({ data: withOwnership(template, req.tenantContext.consultantId ?? null) });
});
const createTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).default("PERSONAL"),
    jsonSchema: jsonSchemaSchema,
    uiSchema: uiSchemaSchema.default({}),
})
    .strict();
// POST /tenants/:tenantId/form-templates — CONSULTANT only;
// form_templates_write_policy ties every insert to the caller's own
// tenant_id + consultant_id regardless of scope.
exports.formTemplatesRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createTemplateSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!consultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_A_CONSULTANT");
        }
        return tx.formTemplate.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId,
                name: body.name,
                scope: body.scope,
                jsonSchema: body.jsonSchema,
                uiSchema: body.uiSchema,
            },
        });
    });
    res.status(201).json({ data: created });
});
const patchTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
    jsonSchema: jsonSchemaSchema.optional(),
    uiSchema: uiSchemaSchema.optional(),
})
    .strict();
// PATCH /tenants/:tenantId/form-templates/:templateId — owning CONSULTANT only.
exports.formTemplatesRouter.patch("/:templateId", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = patchTemplateSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const template = await findTemplate(tx, req.params.templateId);
        await requireOwnTemplate(tx, req.user.id, template);
        const effectiveScope = body.scope ?? template.scope;
        const resubmittingToCommunity = effectiveScope === "COMMUNITY" && template.scope !== "COMMUNITY";
        return tx.formTemplate.update({
            where: { id: req.params.templateId },
            data: {
                ...body,
                jsonSchema: body.jsonSchema,
                uiSchema: body.uiSchema,
                ...(resubmittingToCommunity && { status: "PENDING" }),
            },
        });
    });
    res.json({ data: updated });
});
// DELETE /tenants/:tenantId/form-templates/:templateId — owning CONSULTANT
// only. Soft-deletes via deletedAt.
exports.formTemplatesRouter.delete("/:templateId", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const template = await findTemplate(tx, req.params.templateId);
        await requireOwnTemplate(tx, req.user.id, template);
        await tx.formTemplate.update({
            where: { id: req.params.templateId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
//# sourceMappingURL=form-templates.router.js.map