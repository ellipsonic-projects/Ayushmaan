"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const callerProfile_1 = require("../lib/callerProfile");
const errorHandler_1 = require("../middleware/errorHandler");
// Mounted at /api/tenants/:tenantId/search — powers the header search bar.
exports.searchRouter = (0, express_1.Router)({ mergeParams: true });
exports.searchRouter.use(require_tenant_match_1.requireTenantMatch);
const searchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(2).max(100),
});
const RESULT_LIMIT = 5;
// GET /tenants/:tenantId/search?q=... — looks up consultants, clients,
// interactions, commitments and tasks in one call. CONSULTANT is scoped to
// their own cases (mirrors clients.router.ts's list-clients scoping);
// TENANT_ADMIN/SUPER_ADMIN see the whole tenant.
exports.searchRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query);
    const tenantId = req.params.tenantId;
    const term = { contains: q, mode: "insensitive" };
    const results = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const isConsultant = req.user.role === "CONSULTANT";
        const consultantId = isConsultant ? await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id) : null;
        if (isConsultant && !consultantId) {
            throw new errorHandler_1.AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
        }
        const caseFilter = { tenantId, ...(isConsultant && { consultantId }) };
        const [consultants, clients, interactions, commitments, tasks] = await Promise.all([
            // Peer directory search isn't relevant to a consultant's own workspace.
            isConsultant
                ? Promise.resolve([])
                : tx.consultantProfile.findMany({
                    where: { tenantId, fullName: term },
                    select: { id: true, fullName: true, category: true },
                    take: RESULT_LIMIT,
                }),
            tx.clientProfile.findMany({
                where: { fullName: term, cases: { some: caseFilter } },
                select: { id: true, fullName: true },
                take: RESULT_LIMIT,
            }),
            tx.interaction.findMany({
                where: { notes: term, case: caseFilter },
                select: {
                    id: true,
                    notes: true,
                    type: true,
                    caseId: true,
                    case: { select: { client: { select: { fullName: true } } } },
                },
                take: RESULT_LIMIT,
            }),
            tx.commitment.findMany({
                where: { OR: [{ title: term }, { description: term }], case: caseFilter },
                select: { id: true, title: true, status: true, caseId: true },
                take: RESULT_LIMIT,
            }),
            tx.task.findMany({
                where: { title: term, case: caseFilter },
                select: { id: true, title: true, status: true, caseId: true },
                take: RESULT_LIMIT,
            }),
        ]);
        return { consultants, clients, interactions, commitments, tasks };
    });
    res.json({ data: results });
});
//# sourceMappingURL=search.router.js.map