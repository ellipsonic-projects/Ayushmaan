"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformWorkflowTemplateModerationRouter = exports.workflowTemplatesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
// Mounted at /api/tenants/:tenantId/workflow-templates. List visibility is
// entirely delegated to supabase/policies/11-workflow-templates.sql's
// workflow_templates_scope_policy — this router never adds its own scope
// filtering beyond the `?scope` query param a caller asks for, since the RLS
// policy is the real enforcement (Sprint 5.5.1 item 5).
exports.workflowTemplatesRouter = (0, express_1.Router)({ mergeParams: true });
exports.workflowTemplatesRouter.use(require_tenant_match_1.requireTenantMatch);
exports.workflowTemplatesRouter.use((0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));
async function findTemplate(tx, templateId) {
    const template = await tx.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt) {
        throw new errorHandler_1.AppError(404, "Template not found", "WORKFLOW_TEMPLATE_NOT_FOUND");
    }
    return template;
}
// Scope changes (and any other edit) are only permitted by the owning
// consultant, or by the SUPER_ADMIN who authored a consultantId-less
// COMMUNITY row — workflow_templates_update_policy is the real enforcement
// (it lets any Super Admin touch any row), this just gives a clearer 403
// than a silent RLS-filtered "not found" and keeps edits scoped to the
// authoring admin specifically.
async function requireOwnTemplate(tx, userId, template) {
    if (template.consultantId === null) {
        if (template.createdByUserId !== userId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_TEMPLATE");
        }
        return;
    }
    const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, userId);
    if (!consultantId || consultantId !== template.consultantId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_TEMPLATE");
    }
}
const listQuerySchema = zod_1.z.object({
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
});
// Adds the owning consultant's display name (for TENANT/COMMUNITY rows shared
// by someone else) and an `isOwn` flag the UI uses to hide edit/delete
// affordances on rows the caller doesn't own — workflow_templates_update_policy
// is the real enforcement, this is purely so the client doesn't have to
// re-derive ownership itself (Sprint 5.5.2 item 2). A SUPER_ADMIN-authored
// row (consultantId null) is "own" for the admin who created it instead.
function withOwnership(template, callerConsultantId, callerUserId) {
    const isOwn = template.consultantId !== null
        ? template.consultantId === callerConsultantId
        : template.createdByUserId === callerUserId;
    return { ...template, isOwn };
}
// GET /tenants/:tenantId/workflow-templates
exports.workflowTemplatesRouter.get("/", async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const templates = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.workflowTemplate.findMany({
        where: {
            deletedAt: null,
            ...(query.scope && { scope: query.scope }),
        },
        include: { consultant: { select: { fullName: true } } },
        orderBy: { updatedAt: "desc" },
    }));
    const callerConsultantId = req.tenantContext.consultantId ?? null;
    res.json({ data: templates.map((t) => withOwnership(t, callerConsultantId, req.user.id)) });
});
// GET /tenants/:tenantId/workflow-templates/:templateId
exports.workflowTemplatesRouter.get("/:templateId", async (req, res) => {
    const template = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await findTemplate(tx, req.params.templateId);
        const consultant = found.consultantId
            ? await tx.consultantProfile.findUnique({
                where: { id: found.consultantId },
                select: { fullName: true },
            })
            : null;
        return { ...found, consultant };
    });
    res.json({
        data: withOwnership(template, req.tenantContext.consultantId ?? null, req.user.id),
    });
});
const createTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    channel: zod_1.z.literal("EMAIL"),
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).default("PERSONAL"),
    subject: zod_1.z.string().max(255).optional(),
    content: zod_1.z.record(zod_1.z.unknown()).default({}),
})
    .strict();
// POST /tenants/:tenantId/workflow-templates — CONSULTANT or SUPER_ADMIN;
// workflow_templates_write_policy ties every insert to the caller's own
// tenant_id + consultant_id (or, for a Super Admin, a null consultant_id)
// regardless of the scope being written. A SUPER_ADMIN's row is always
// forced to scope=COMMUNITY, status=APPROVED — authored directly by the
// platform, so it needs no separate moderation pass the way a consultant's
// COMMUNITY submission does.
exports.workflowTemplatesRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT", "SUPER_ADMIN"), async (req, res) => {
    const body = createTemplateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "SUPER_ADMIN";
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        if (isSuperAdmin) {
            return tx.workflowTemplate.create({
                data: {
                    tenantId: req.params.tenantId,
                    consultantId: null,
                    createdByUserId: req.user.id,
                    name: body.name,
                    channel: body.channel,
                    scope: "COMMUNITY",
                    status: "APPROVED",
                    subject: body.subject,
                    content: body.content,
                },
            });
        }
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!consultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_A_CONSULTANT");
        }
        return tx.workflowTemplate.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId,
                name: body.name,
                channel: body.channel,
                scope: body.scope,
                // COMMUNITY starts PENDING (the column default) — everything else
                // is never gated by status, so leaving it at the default is fine.
                subject: body.subject,
                content: body.content,
            },
        });
    });
    res.status(201).json({ data: created });
});
const patchTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
    scope: zod_1.z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
    subject: zod_1.z.string().max(255).optional(),
    content: zod_1.z.record(zod_1.z.unknown()).optional(),
})
    .strict();
// PATCH /tenants/:tenantId/workflow-templates/:templateId — owning
// CONSULTANT, or the SUPER_ADMIN who authored the row.
exports.workflowTemplatesRouter.patch("/:templateId", (0, require_role_1.requireRole)("CONSULTANT", "SUPER_ADMIN"), async (req, res) => {
    const body = patchTemplateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "SUPER_ADMIN";
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const template = await findTemplate(tx, req.params.templateId);
        await requireOwnTemplate(tx, req.user.id, template);
        // Every (re)submission to COMMUNITY needs a fresh Super Admin verdict:
        // either the scope is only just becoming COMMUNITY, or it already was
        // COMMUNITY and the visible content is changing — reusing a stale
        // APPROVED verdict on edited content would bypass moderation entirely.
        // Doesn't apply to a SUPER_ADMIN's own row — there's no one above them
        // to moderate it, so it just stays APPROVED.
        const effectiveScope = body.scope ?? template.scope;
        const contentChanged = body.content !== undefined || body.name !== undefined || body.subject !== undefined;
        const resubmittingToCommunity = !isSuperAdmin &&
            effectiveScope === "COMMUNITY" &&
            (template.scope !== "COMMUNITY" || (contentChanged && template.status !== "PENDING"));
        return tx.workflowTemplate.update({
            where: { id: req.params.templateId },
            data: {
                ...body,
                content: body.content,
                ...(resubmittingToCommunity && { status: "PENDING" }),
            },
        });
    });
    res.json({ data: updated });
});
// DELETE /tenants/:tenantId/workflow-templates/:templateId — owning
// CONSULTANT, or the SUPER_ADMIN who authored the row. Soft-deletes via
// deletedAt.
exports.workflowTemplatesRouter.delete("/:templateId", (0, require_role_1.requireRole)("CONSULTANT", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const template = await findTemplate(tx, req.params.templateId);
        await requireOwnTemplate(tx, req.user.id, template);
        await tx.workflowTemplate.update({
            where: { id: req.params.templateId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
// Mounted at /api/platform/workflow-templates — Sprint 5.5.5 item 5's
// resolved moderation question. Cross-tenant by design (same rationale as
// platform-grievances.router.ts's GET /platform/grievances): a Super Admin
// reviewing COMMUNITY submissions is the normal access pattern here, not an
// escalation, so this bypasses tenant scoping via isSuperAdmin rather than
// nesting under a single :tenantId.
exports.platformWorkflowTemplateModerationRouter = (0, express_1.Router)();
exports.platformWorkflowTemplateModerationRouter.use((0, require_role_1.requireRole)("SUPER_ADMIN"));
const listModerationQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});
exports.platformWorkflowTemplateModerationRouter.get("/", async (req, res) => {
    const query = listModerationQuerySchema.parse(req.query);
    const templates = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const found = await tx.workflowTemplate.findMany({
            where: { scope: "COMMUNITY", status: query.status, deletedAt: null },
            include: { consultant: { select: { fullName: true } } },
            orderBy: { updatedAt: "desc" },
        });
        const tenantIds = [
            ...new Set(found.map((t) => t.tenantId).filter((id) => id !== null)),
        ];
        const tenants = tenantIds.length
            ? await tx.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, displayName: true },
            })
            : [];
        const tenantById = new Map(tenants.map((t) => [t.id, t]));
        return found.map((t) => ({
            ...t,
            tenant: t.tenantId ? (tenantById.get(t.tenantId) ?? null) : null,
        }));
    });
    res.json({ data: templates });
});
const moderateTemplateSchema = zod_1.z.object({ status: zod_1.z.enum(["APPROVED", "REJECTED"]) }).strict();
// PATCH /api/platform/workflow-templates/:templateId — approve/reject a
// COMMUNITY submission. Deliberately its own endpoint rather than folding
// into the tenant-scoped PATCH above — a Super Admin acting here isn't
// scoped to any one tenant, and the only field it's allowed to touch is
// `status`, never the template's content.
exports.platformWorkflowTemplateModerationRouter.patch("/:templateId", async (req, res) => {
    const body = moderateTemplateSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        const template = await tx.workflowTemplate.findUnique({
            where: { id: req.params.templateId },
        });
        if (!template || template.deletedAt || template.scope !== "COMMUNITY") {
            throw new errorHandler_1.AppError(404, "Community template not found", "WORKFLOW_TEMPLATE_NOT_FOUND");
        }
        return tx.workflowTemplate.update({
            where: { id: template.id },
            data: { status: body.status },
        });
    });
    res.json({ data: updated });
});
// Authoring endpoints below — same router, same SUPER_ADMIN-only /
// cross-tenant rationale as the moderation endpoints above, but for a Super
// Admin's own COMMUNITY templates (tenant_id/consultant_id null) rather than
// reviewing a consultant's submission.
async function findOwnPlatformTemplate(tx, userId, templateId) {
    const template = await tx.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt || template.consultantId !== null) {
        throw new errorHandler_1.AppError(404, "Template not found", "WORKFLOW_TEMPLATE_NOT_FOUND");
    }
    if (template.createdByUserId !== userId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_TEMPLATE");
    }
    return template;
}
// GET /api/platform/workflow-templates/:templateId — used by the authoring
// editor page to load a Super Admin's own template.
exports.platformWorkflowTemplateModerationRouter.get("/:templateId", async (req, res) => {
    const template = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => findOwnPlatformTemplate(tx, req.user.id, req.params.templateId));
    res.json({ data: { ...template, isOwn: true } });
});
const createPlatformTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    channel: zod_1.z.literal("EMAIL"),
    subject: zod_1.z.string().max(255).optional(),
    content: zod_1.z.record(zod_1.z.unknown()).default({}),
})
    .strict();
// POST /api/platform/workflow-templates — always scope=COMMUNITY,
// status=APPROVED, tenant_id/consultant_id null. Mirrors
// workflow-templates.router.ts's tenant-scoped POST SUPER_ADMIN branch minus
// the :tenantId.
exports.platformWorkflowTemplateModerationRouter.post("/", async (req, res) => {
    const body = createPlatformTemplateSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (tx) => tx.workflowTemplate.create({
        data: {
            tenantId: null,
            consultantId: null,
            createdByUserId: req.user.id,
            name: body.name,
            channel: body.channel,
            scope: "COMMUNITY",
            status: "APPROVED",
            subject: body.subject,
            content: body.content,
        },
    }));
    res.status(201).json({ data: { ...created, isOwn: true } });
});
const patchPlatformTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
    subject: zod_1.z.string().max(255).optional(),
    content: zod_1.z.record(zod_1.z.unknown()).optional(),
})
    .strict();
// PATCH /api/platform/workflow-templates/:templateId/content — content edits
// for the authoring Super Admin's own row. Deliberately a distinct path from
// the status-only moderation PATCH /:templateId above — this never touches
// scope/status (already COMMUNITY/APPROVED, and there's no one above a
// Super Admin to re-moderate their own edit).
exports.platformWorkflowTemplateModerationRouter.patch("/:templateId/content", async (req, res) => {
    const body = patchPlatformTemplateSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        await findOwnPlatformTemplate(tx, req.user.id, req.params.templateId);
        return tx.workflowTemplate.update({
            where: { id: req.params.templateId },
            data: { ...body, content: body.content },
        });
    });
    res.json({ data: { ...updated, isOwn: true } });
});
// DELETE /api/platform/workflow-templates/:templateId — soft-delete for the
// authoring Super Admin's own row.
exports.platformWorkflowTemplateModerationRouter.delete("/:templateId", async (req, res) => {
    await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, async (tx) => {
        await findOwnPlatformTemplate(tx, req.user.id, req.params.templateId);
        await tx.workflowTemplate.update({
            where: { id: req.params.templateId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
//# sourceMappingURL=workflow-templates.router.js.map