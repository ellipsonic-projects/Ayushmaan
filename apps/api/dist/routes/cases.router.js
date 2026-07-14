"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.casesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const cases_service_1 = require("../services/cases.service");
// data_api_v4.md §10 — cases. Mounted at /api/tenants/:tenantId/cases.
//
// This is a minimal slice (list/create/get) — just enough for
// appointments.router.ts to have a parent resource to attach to. PATCH
// (tags/status/matterKey), the /escalate SECURITY DEFINER path, and
// /export are deliberately not built yet; they belong to Phase 4 session
// logging (sprints_v3.md), not this booking-loop pass.
exports.casesRouter = (0, express_1.Router)({ mergeParams: true });
exports.casesRouter.use(require_tenant_match_1.requireTenantMatch);
const listCasesQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", "CLOSED"]).optional(),
    tag: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
// GET /tenants/:tenantId/cases — CONSULTANT (own only), TENANT_ADMIN
// (metadata only, not notes — this slice has no note content yet anyway).
exports.casesRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const query = listCasesQuerySchema.parse(req.query);
    const cases = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const where = {
            tenantId: req.params.tenantId,
            status: query.status,
            ...(query.tag && { tags: { has: query.tag } }),
        };
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (!consultantId)
                return [];
            where.consultantId = consultantId;
        }
        if (query.search) {
            where.matterKey = { contains: query.search, mode: "insensitive" };
        }
        return tx.case.findMany({ where });
    });
    res.json({ data: cases });
});
const createCaseSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    category: zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
    matterKey: zod_1.z.string().max(150).optional(),
}).strict();
// POST /tenants/:tenantId/cases — CONSULTANT. consultantId is forced to the
// caller's own profile id — a Consultant can never create a case on
// another consultant's behalf.
exports.casesRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createCaseSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!consultantId)
            throw new errorHandler_1.AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
        const client = await tx.clientProfile.findUnique({ where: { id: body.clientId } });
        if (!client || client.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
        }
        return tx.case.create({
            data: {
                tenantId: req.params.tenantId,
                clientId: body.clientId,
                consultantId,
                category: body.category,
                matterKey: body.matterKey,
            },
        });
    });
    res.status(201).json({ data: created });
});
// GET /tenants/:tenantId/cases/:caseId — CONSULTANT (own), self (CLIENT),
// TENANT_ADMIN (metadata only), SUPER_ADMIN (any tenant, audit-logged —
// PRD §1.4 "View own case timeline" row, schema §1.2 "unrestricted ≠ invisible").
exports.casesRouter.get("/:caseId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    if (req.user.role === "SUPER_ADMIN") {
        const found = await (0, cases_service_1.getCaseAuditedForSuperAdmin)(req.params.caseId, req.user.id);
        if (found.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        return res.json({ data: found });
    }
    const found = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (consultantId !== target.consultantId)
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
        if (req.user.role === "CLIENT") {
            const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
            if (clientId !== target.clientId)
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
        return target;
    });
    res.json({ data: found });
});
//# sourceMappingURL=cases.router.js.map