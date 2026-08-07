"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformConsultantInviteCodesRouter = exports.consultantInviteCodesRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const CODE_TTL_HOURS = 24;
const MAX_GENERATION_ATTEMPTS = 10;
const CODE_LENGTH = 10;
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateCode() {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[(0, crypto_1.randomInt)(0, CODE_ALPHABET.length)];
    }
    return code;
}
// Tenant-admin invite-code management, mounted at
// /api/tenants/:tenantId/consultant-invite-codes. A TENANT_ADMIN generates a
// code here and sends it to a prospective consultant out-of-band (phone
// call, WhatsApp, etc.); the applicant then redeems it in
// consultant-applications.router.ts's POST /clients/consultant-applications.
exports.consultantInviteCodesRouter = (0, express_1.Router)({ mergeParams: true });
exports.consultantInviteCodesRouter.use(require_tenant_match_1.requireTenantMatch);
// POST /tenants/:tenantId/consultant-invite-codes
exports.consultantInviteCodesRouter.post("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const inviteCode = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
            const code = generateCode();
            const existing = await tx.consultantInviteCode.findUnique({ where: { code } });
            if (existing)
                continue;
            return tx.consultantInviteCode.create({
                data: {
                    tenantId: req.params.tenantId,
                    code,
                    createdBy: req.user.id,
                    expiresAt: new Date(Date.now() + CODE_TTL_HOURS * 60 * 60 * 1000),
                },
            });
        }
        throw new errorHandler_1.AppError(500, "Could not generate a unique code, please retry", "CODE_GENERATION_FAILED");
    });
    res.status(201).json({ data: inviteCode });
});
const listQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", "USED", "REVOKED"]).optional(),
});
// GET /tenants/:tenantId/consultant-invite-codes
exports.consultantInviteCodesRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const inviteCodes = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.consultantInviteCode.findMany({
        where: { tenantId: req.params.tenantId, ...(query.status && { status: query.status }) },
        orderBy: { createdAt: "desc" },
    }));
    res.json({ data: inviteCodes });
});
// POST /tenants/:tenantId/consultant-invite-codes/:id/revoke — deletes the
// row outright rather than marking status REVOKED: revoke only ever applies
// to an ACTIVE code, which by definition has no ConsultantApplication
// referencing it yet, so there's nothing a delete could orphan.
exports.consultantInviteCodesRouter.post("/:id/revoke", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const found = await tx.consultantInviteCode.findUnique({ where: { id: req.params.id } });
        if (!found || found.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Invite code not found", "INVITE_CODE_NOT_FOUND");
        }
        if (found.status !== "ACTIVE") {
            throw new errorHandler_1.AppError(409, "Invite code is no longer active", "INVITE_CODE_NOT_ACTIVE");
        }
        await tx.consultantInviteCode.delete({ where: { id: found.id } });
    });
    res.status(204).end();
});
// Platform-level lookup, mounted at /api/clients/consultant-invite-codes —
// a CLIENT account has no tenantId, same precedent as
// platformConsultantApplicationsRouter (consultant-applications.router.ts).
exports.platformConsultantInviteCodesRouter = (0, express_1.Router)();
const codeParamSchema = zod_1.z.string().regex(/^[A-Z0-9]{10}$/);
// GET /clients/consultant-invite-codes/:code — lets the applicant confirm
// which organization a code belongs to before filling out the rest of the
// application form. Returns only the tenant's public directory fields.
exports.platformConsultantInviteCodesRouter.get("/:code", (0, require_role_1.requireRole)("CLIENT"), async (req, res) => {
    const code = codeParamSchema.safeParse(req.params.code);
    if (!code.success) {
        throw new errorHandler_1.AppError(400, "Invalid code format", "INVALID_CODE_FORMAT");
    }
    const inviteCode = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.consultantInviteCode.findUnique({
        where: { code: code.data },
        include: { tenant: { select: { displayName: true, slug: true, logoUrl: true } } },
    }));
    if (!inviteCode ||
        inviteCode.status !== "ACTIVE" ||
        inviteCode.expiresAt.getTime() < Date.now()) {
        throw new errorHandler_1.AppError(404, "Invite code not found or expired", "INVITE_CODE_NOT_FOUND");
    }
    res.json({ data: { tenant: inviteCode.tenant } });
});
//# sourceMappingURL=consultant-invite-codes.router.js.map