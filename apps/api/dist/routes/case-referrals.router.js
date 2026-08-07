"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseReferralsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const notification_service_1 = require("../services/notification.service");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
// Mounted at /api/tenants/:tenantId/cases/:caseId/refer. Sprint 4.5 wired
// this entry point; the accept/decline inbox/outbox is
// consultant-referrals.router.ts (Phase 6, Sprint 6.1).
exports.caseReferralsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseReferralsRouter.use(require_tenant_match_1.requireTenantMatch);
const referSchema = zod_1.z
    .object({
    toConsultantId: zod_1.z.string().uuid(),
    contextNote: zod_1.z.string().max(1000).optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/refer — CONSULTANT (own case).
exports.caseReferralsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = referSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        if (body.toConsultantId === caseRow.consultantId) {
            throw new errorHandler_1.AppError(422, "Cannot refer a case to its own consultant", "SELF_REFERRAL");
        }
        const toConsultant = await tx.consultantProfile.findUnique({
            where: { id: body.toConsultantId },
        });
        if (!toConsultant || toConsultant.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        const referral = await tx.consultantReferral.create({
            data: {
                tenantId: req.params.tenantId,
                fromConsultantId: caseRow.consultantId,
                toConsultantId: body.toConsultantId,
                clientId: caseRow.clientId,
                sourceCaseId: caseRow.id,
                contextNote: body.contextNote,
            },
        });
        await (0, notification_service_1.dispatch)(tx, {
            tenantId: req.params.tenantId,
            userId: toConsultant.userId,
            type: "CASE_REFERRAL_RECEIVED",
            message: {
                subject: "New case referral",
                body: "A colleague referred a case to you. Open your referrals to review it.",
            },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "REFERRAL_CREATED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
            referral: { id: referral.id, toConsultantId: referral.toConsultantId },
        });
        return referral;
    });
    res.status(201).json({ data: created });
});
//# sourceMappingURL=case-referrals.router.js.map