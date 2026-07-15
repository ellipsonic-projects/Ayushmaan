"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
// Shared tenant-wide contacts directory (referral partners, vendors, other
// non-client contacts). Mounted at /api/tenants/:tenantId/contacts.
exports.contactsRouter = (0, express_1.Router)({ mergeParams: true });
exports.contactsRouter.use(require_tenant_match_1.requireTenantMatch);
const listContactsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    type: zod_1.z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
});
// GET /tenants/:tenantId/contacts
exports.contactsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const query = listContactsQuerySchema.parse(req.query);
    const contacts = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.contact.findMany({
        where: {
            tenantId: req.params.tenantId,
            ...(query.type && { type: query.type }),
            ...(query.search && {
                OR: [
                    { fullName: { contains: query.search, mode: "insensitive" } },
                    { organization: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                ],
            }),
        },
        orderBy: { fullName: "asc" },
    }));
    res.json({ data: contacts });
});
const createContactSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200),
    type: zod_1.z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
    organization: zod_1.z.string().max(200).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(20).optional(),
    notes: zod_1.z.string().optional(),
})
    .strict();
// POST /tenants/:tenantId/contacts
exports.contactsRouter.post("/", (0, require_role_1.requireRole)("TENANT_ADMIN"), async (req, res) => {
    const body = createContactSchema.parse(req.body);
    const contact = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.contact.create({
        data: {
            tenantId: req.params.tenantId,
            createdBy: req.user.id,
            ...body,
        },
    }));
    res.status(201).json({ data: contact });
});
async function findContact(tx, tenantId, contactId) {
    const contact = await tx.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }
    return contact;
}
// GET /tenants/:tenantId/contacts/:contactId
exports.contactsRouter.get("/:contactId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const contact = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => findContact(tx, req.params.tenantId, req.params.contactId));
    res.json({ data: contact });
});
const patchContactSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200).optional(),
    type: zod_1.z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
    organization: zod_1.z.string().max(200).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(20).optional(),
    notes: zod_1.z.string().optional(),
})
    .strict();
// PATCH /tenants/:tenantId/contacts/:contactId
exports.contactsRouter.patch("/:contactId", (0, require_role_1.requireRole)("TENANT_ADMIN"), async (req, res) => {
    const updates = patchContactSchema.parse(req.body);
    const contact = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findContact(tx, req.params.tenantId, req.params.contactId);
        return tx.contact.update({ where: { id: req.params.contactId }, data: updates });
    });
    res.json({ data: contact });
});
// DELETE /tenants/:tenantId/contacts/:contactId
exports.contactsRouter.delete("/:contactId", (0, require_role_1.requireRole)("TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findContact(tx, req.params.tenantId, req.params.contactId);
        await tx.contact.delete({ where: { id: req.params.contactId } });
    });
    res.status(204).send();
});
//# sourceMappingURL=contacts.router.js.map