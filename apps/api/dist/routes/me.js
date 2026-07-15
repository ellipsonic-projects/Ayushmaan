"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const rls_context_1 = require("@ayushman/db/rls-context");
exports.meRouter = (0, express_1.Router)();
// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
exports.meRouter.get("/me", async (req, res) => {
    // tenant_read_own (supabase/policies/02-tenants.sql) lets a session read
    // its own tenant row by app.tenant_id — exactly the lookup GET /auth/me
    // needs, no super-admin bypass required.
    const tenantId = req.user.tenantId;
    const tenant = tenantId
        ? await (0, rls_context_1.withTenantContext)({ tenantId, isSuperAdmin: false, userId: req.user.id }, (tx) => tx.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true, status: true },
        }))
        : null;
    res.json({
        data: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            tenantId: req.user.tenantId,
            tenant,
        },
    });
});
//# sourceMappingURL=me.js.map