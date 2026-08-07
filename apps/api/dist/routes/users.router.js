"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const workflow_events_1 = require("../lib/workflow-events");
const phone_1 = require("../lib/phone");
// data_api_v4.md §6 — users. Mounted at /api/tenants/:tenantId/users
// (mergeParams so :tenantId from the parent mount is visible here).
exports.usersRouter = (0, express_1.Router)({ mergeParams: true });
exports.usersRouter.use(require_tenant_match_1.requireTenantMatch);
const listUsersQuerySchema = zod_1.z.object({
    role: zod_1.z.enum(["SUPER_ADMIN", "TENANT_ADMIN", "CONSULTANT", "CLIENT"]).optional(),
    accountStatus: zod_1.z.enum(["ACTIVE", "SUSPENDED", "BANNED", "DELETED"]).optional(),
    search: zod_1.z.string().optional(),
});
// GET /tenants/:tenantId/users
exports.usersRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const query = listUsersQuerySchema.parse(req.query);
    const users = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.user.findMany({
        where: {
            tenantId: req.params.tenantId,
            role: query.role,
            accountStatus: query.accountStatus,
            ...(query.search && { email: { contains: query.search, mode: "insensitive" } }),
        },
        orderBy: { createdAt: "desc" },
    }));
    res.json({ data: users });
});
const createUserSchema = zod_1.z
    .object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(["TENANT_ADMIN", "CONSULTANT", "CLIENT"]),
    phone: phone_1.phoneSchema,
})
    .strict();
// POST /tenants/:tenantId/users — invites via Supabase Admin API + creates
// the public.users row. A TENANT_ADMIN may only invite role=CONSULTANT
// (self-escalation guard, data_api_v4.md §6); SUPER_ADMIN may invite any role.
exports.usersRouter.post("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createUserSchema.parse(req.body);
    if (req.user.role === "TENANT_ADMIN" && body.role !== "CONSULTANT") {
        throw new errorHandler_1.AppError(403, "A Tenant Admin may only invite users with role=CONSULTANT", "SELF_ESCALATION_BLOCKED");
    }
    const { data: invited, error: inviteError } = await supabaseAdmin_1.supabaseAdmin.auth.admin.inviteUserByEmail(body.email);
    if (inviteError || !invited.user) {
        throw new errorHandler_1.AppError(502, `Failed to invite user: ${inviteError?.message ?? "unknown error"}`, "INVITE_FAILED");
    }
    const user = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const created = await tx.user.create({
            data: {
                supabaseAuthUserId: invited.user.id,
                tenantId: req.params.tenantId,
                role: body.role,
                email: body.email,
                phone: body.phone,
                emailIsVerified: !!invited.user.email_confirmed_at,
            },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "USER_INVITED", {
            user: { id: created.id, role: created.role, email: created.email },
        });
        return created;
    });
    res.status(201).json({ data: user });
});
function requireSelfOrAdmin(req, res, next) {
    const isAdmin = req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN";
    const isSelf = req.params.userId === req.user.id;
    if (!isAdmin && !isSelf) {
        return next(new errorHandler_1.AppError(403, "Forbidden", "ROLE_FORBIDDEN"));
    }
    next();
}
// GET /tenants/:tenantId/users/:userId
exports.usersRouter.get("/:userId", requireSelfOrAdmin, async (req, res) => {
    const user = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.user.findUnique({ where: { id: req.params.userId } }));
    if (!user || user.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "User not found", "USER_NOT_FOUND");
    }
    res.json({ data: user });
});
const patchUserSchema = zod_1.z
    .object({
    accountStatus: zod_1.z.enum(["ACTIVE", "SUSPENDED", "BANNED", "DELETED"]).optional(),
    phone: phone_1.optionalPhoneSchema,
})
    .strict();
// PATCH /tenants/:tenantId/users/:userId — a TENANT_ADMIN cannot target a
// SUPER_ADMIN or another TENANT_ADMIN row (checked against the target row's
// role, not just the tenant match).
exports.usersRouter.patch("/:userId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const updates = patchUserSchema.parse(req.body);
    const user = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.user.findUnique({ where: { id: req.params.userId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "User not found", "USER_NOT_FOUND");
        }
        if (req.user.role === "TENANT_ADMIN" &&
            (target.role === "TENANT_ADMIN" || target.role === "SUPER_ADMIN")) {
            throw new errorHandler_1.AppError(403, "A Tenant Admin cannot modify an admin-level account", "SELF_ESCALATION_BLOCKED");
        }
        return tx.user.update({ where: { id: req.params.userId }, data: updates });
    });
    res.json({ data: user });
});
// DELETE /tenants/:tenantId/users/:userId — soft-deactivate only
// (accountStatus = DELETED); PII cleared 30 days later by a background job,
// not this call.
exports.usersRouter.delete("/:userId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const user = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.user.findUnique({ where: { id: req.params.userId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "User not found", "USER_NOT_FOUND");
        }
        if (req.user.role === "TENANT_ADMIN" &&
            (target.role === "TENANT_ADMIN" || target.role === "SUPER_ADMIN")) {
            throw new errorHandler_1.AppError(403, "A Tenant Admin cannot deactivate an admin-level account", "SELF_ESCALATION_BLOCKED");
        }
        return tx.user.update({
            where: { id: req.params.userId },
            data: { accountStatus: "DELETED" },
        });
    });
    res.json({ data: user });
});
//# sourceMappingURL=users.router.js.map