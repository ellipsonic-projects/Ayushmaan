"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardianLinksRouter = exports.clientsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
// data_api_v4.md §7 — client_profiles, client_category_profiles, guardian_links.
// Mounted at /api/tenants/:tenantId/clients.
exports.clientsRouter = (0, express_1.Router)({ mergeParams: true });
exports.clientsRouter.use(require_tenant_match_1.requireTenantMatch);
const listClientsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    // `tag` filters via the parent Case's tags[] (per-consultant CRM tags,
    // schema §3.11) — there is no `pinned` column anywhere in the schema yet,
    // so that query param from the doc isn't implemented.
    tag: zod_1.z.string().optional(),
});
// GET /tenants/:tenantId/clients
exports.clientsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const query = listClientsQuerySchema.parse(req.query);
    const clients = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const searchFilter = query.search
            ? { fullName: { contains: query.search, mode: "insensitive" } }
            : {};
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (!consultantId)
                return [];
            return tx.clientProfile.findMany({
                where: {
                    tenantId: req.params.tenantId,
                    ...searchFilter,
                    cases: { some: { consultantId, ...(query.tag && { tags: { has: query.tag } }) } },
                },
            });
        }
        // TENANT_ADMIN — all clients in the tenant.
        return tx.clientProfile.findMany({
            where: { tenantId: req.params.tenantId, ...searchFilter },
        });
    });
    res.json({ data: clients });
});
async function assertClientReadAccess(tx, req, clientId) {
    const client = await tx.clientProfile.findUnique({ where: { id: clientId } });
    if (!client || client.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
    }
    if (req.user.role === "TENANT_ADMIN")
        return client;
    if (req.user.role === "CLIENT") {
        const ownId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
        if (ownId !== clientId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        return client;
    }
    if (req.user.role === "CONSULTANT") {
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        const linked = consultantId
            ? await tx.case.findFirst({ where: { clientId, consultantId } })
            : null;
        if (!linked)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_A_LINKED_CLIENT");
        return client;
    }
    throw new errorHandler_1.AppError(403, "Forbidden", "ROLE_FORBIDDEN");
}
// GET /tenants/:tenantId/clients/:clientId
exports.clientsRouter.get("/:clientId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "CLIENT"), async (req, res) => {
    const client = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => assertClientReadAccess(tx, req, req.params.clientId));
    res.json({ data: client });
});
const patchClientSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200).optional(),
    preferredLanguage: zod_1.z.string().max(50).optional(),
    timezone: zod_1.z.string().max(50).optional(),
    emergencyContactName: zod_1.z.string().max(200).optional(),
    emergencyContactPhone: zod_1.z.string().max(20).optional(),
    dob: zod_1.z.string().optional(), // rejected below if a consented guardian link already exists
})
    .strict();
// PATCH /tenants/:tenantId/clients/:clientId — self (CLIENT), TENANT_ADMIN
// (support edits). dob is immutable once a guardian consent row exists.
exports.clientsRouter.patch("/:clientId", (0, require_role_1.requireRole)("CLIENT", "TENANT_ADMIN"), async (req, res) => {
    const { dob, ...updates } = patchClientSchema.parse(req.body);
    const client = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
        }
        if (req.user.role === "CLIENT") {
            const ownId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
            if (ownId !== req.params.clientId)
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        }
        if (dob !== undefined) {
            const consented = await tx.guardianLink.findFirst({
                where: { minorClientId: req.params.clientId, consentGivenAt: { not: null } },
            });
            if (consented) {
                throw new errorHandler_1.AppError(422, "dob is immutable once guardian consent has been given", "DOB_LOCKED");
            }
        }
        return tx.clientProfile.update({
            where: { id: req.params.clientId },
            data: { ...updates, ...(dob !== undefined && { dob: new Date(dob) }) },
        });
    });
    res.json({ data: client });
});
// GET /tenants/:tenantId/clients/:clientId/category-profiles
exports.clientsRouter.get("/:clientId/category-profiles", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "CLIENT"), async (req, res) => {
    const profiles = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await assertClientReadAccess(tx, req, req.params.clientId);
        return tx.clientCategoryProfile.findMany({ where: { clientId: req.params.clientId } });
    });
    res.json({ data: profiles });
});
const categoryEnum = zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]);
const putCategoryProfileSchema = zod_1.z.object({ data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()) }).strict();
// PUT /tenants/:tenantId/clients/:clientId/category-profiles/:category — self
// (CLIENT), CONSULTANT (own, intake on behalf of client). Upserts on the
// (clientId, category) unique constraint.
exports.clientsRouter.put("/:clientId/category-profiles/:category", (0, require_role_1.requireRole)("CLIENT", "CONSULTANT"), async (req, res) => {
    const category = categoryEnum.parse(req.params.category);
    const body = putCategoryProfileSchema.parse(req.body);
    const profile = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const client = await tx.clientProfile.findUnique({ where: { id: req.params.clientId } });
        if (!client || client.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
        }
        if (req.user.role === "CLIENT") {
            const ownId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
            if (ownId !== req.params.clientId)
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        }
        else {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            const activeCase = consultantId
                ? await tx.case.findFirst({
                    where: { clientId: req.params.clientId, consultantId, category },
                })
                : null;
            if (!activeCase)
                throw new errorHandler_1.AppError(403, "Forbidden", "NO_ACTIVE_CASE_IN_CATEGORY");
        }
        return tx.clientCategoryProfile.upsert({
            where: { clientId_category: { clientId: req.params.clientId, category } },
            create: {
                tenantId: req.params.tenantId,
                clientId: req.params.clientId,
                category,
                data: body.data,
            },
            update: { data: body.data },
        });
    });
    res.json({ data: profile });
});
const createGuardianLinkSchema = zod_1.z
    .object({
    minorClientId: zod_1.z.string().uuid(),
    relationship: zod_1.z.string().min(1).max(50),
})
    .strict();
// POST /tenants/:tenantId/clients/:clientId/guardians — self (adult CLIENT).
// `:clientId` in the doc's path is the caller's own profile; the dependent's
// existing client_profiles row id is supplied in the body as minorClientId.
// Ownership of the new guardian_links row is established by this call itself.
exports.clientsRouter.post("/:clientId/guardians", (0, require_role_1.requireRole)("CLIENT"), async (req, res) => {
    const body = createGuardianLinkSchema.parse(req.body);
    const link = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
        if (ownId !== req.params.clientId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        const minor = await tx.clientProfile.findUnique({ where: { id: body.minorClientId } });
        if (!minor || minor.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Dependent client profile not found", "CLIENT_NOT_FOUND");
        }
        return tx.guardianLink.create({
            data: {
                tenantId: req.params.tenantId,
                minorClientId: body.minorClientId,
                guardianUserId: req.user.id,
                relationship: body.relationship,
            },
        });
    });
    res.status(201).json({ data: link });
});
// GET /tenants/:tenantId/clients/:clientId/guardians
exports.clientsRouter.get("/:clientId/guardians", (0, require_role_1.requireRole)("CLIENT", "CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const links = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await assertClientReadAccess(tx, req, req.params.clientId);
        return tx.guardianLink.findMany({ where: { minorClientId: req.params.clientId } });
    });
    res.json({ data: links });
});
// data_api_v4.md §7 puts these two routes at /tenants/:tenantId/guardian-links/...,
// a sibling of /clients rather than nested under it — exported separately so
// index.ts can mount it at the matching path.
exports.guardianLinksRouter = (0, express_1.Router)({ mergeParams: true });
exports.guardianLinksRouter.use(require_tenant_match_1.requireTenantMatch);
// POST /tenants/:tenantId/guardian-links/:linkId/consent — only the
// guardian_user_id on that specific row may consent.
exports.guardianLinksRouter.post("/:linkId/consent", (0, require_role_1.requireRole)("CLIENT"), async (req, res) => {
    const link = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.guardianLink.findUnique({ where: { id: req.params.linkId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
        }
        if (target.guardianUserId !== req.user.id) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_THE_GUARDIAN");
        }
        return tx.guardianLink.update({
            where: { id: req.params.linkId },
            data: { consentGivenAt: new Date() },
        });
    });
    res.json({ data: link });
});
// DELETE /tenants/:tenantId/guardian-links/:linkId — guardian, TENANT_ADMIN.
exports.guardianLinksRouter.delete("/:linkId", (0, require_role_1.requireRole)("CLIENT", "TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.guardianLink.findUnique({ where: { id: req.params.linkId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Guardian link not found", "GUARDIAN_LINK_NOT_FOUND");
        }
        if (req.user.role === "CLIENT" && target.guardianUserId !== req.user.id) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_THE_GUARDIAN");
        }
        await tx.guardianLink.delete({ where: { id: req.params.linkId } });
    });
    res.status(204).send();
});
//# sourceMappingURL=clients.router.js.map