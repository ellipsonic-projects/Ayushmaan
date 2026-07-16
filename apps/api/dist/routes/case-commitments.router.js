"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseCommitmentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const caseAccess_1 = require("../lib/caseAccess");
// Mounted at /api/tenants/:tenantId/cases/:caseId/commitments.
exports.caseCommitmentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseCommitmentsRouter.use(require_tenant_match_1.requireTenantMatch);
const createCommitmentSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    dueAt: zod_1.z.string().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/commitments — CONSULTANT (own case).
exports.caseCommitmentsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createCommitmentSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        return tx.commitment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                title: body.title,
                description: body.description,
                dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
            },
        });
    });
    res.status(201).json({ data: created });
});
//# sourceMappingURL=case-commitments.router.js.map