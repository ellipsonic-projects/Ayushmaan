"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseTasksRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const caseAccess_1 = require("../lib/caseAccess");
// Mounted at /api/tenants/:tenantId/cases/:caseId/tasks.
exports.caseTasksRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseTasksRouter.use(require_tenant_match_1.requireTenantMatch);
const createTaskSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200),
    dueAt: zod_1.z.string().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/tasks — CONSULTANT (own case).
// Created tasks are always assigned to the consultant themself — there's no
// assignee picker in the UI that calls this yet.
exports.caseTasksRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createTaskSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        return tx.task.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                title: body.title,
                dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
                assignedTo: "CONSULTANT",
            },
        });
    });
    res.status(201).json({ data: created });
});
//# sourceMappingURL=case-tasks.router.js.map