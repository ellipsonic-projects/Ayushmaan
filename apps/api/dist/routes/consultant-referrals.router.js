"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consultantReferralsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const notification_service_1 = require("../services/notification.service");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
// Mounted at /api/tenants/:tenantId/consultant-referrals. Phase 6, Sprint 6.1
// item 3 — completes the cross-consultant hand-off flow whose entry point
// (POST /cases/:caseId/refer) was wired in Sprint 4.5.
exports.consultantReferralsRouter = (0, express_1.Router)({ mergeParams: true });
exports.consultantReferralsRouter.use(require_tenant_match_1.requireTenantMatch);
exports.consultantReferralsRouter.use((0, require_role_1.requireRole)("CONSULTANT"));
const caseSnapshotInclude = {
    client: {
        select: {
            fullName: true,
            user: { select: { email: true, phone: true } },
        },
    },
    consultant: { select: { id: true, fullName: true } },
    appointments: { orderBy: { scheduledStart: "desc" } },
    interactions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    commitments: { orderBy: { createdAt: "desc" } },
    tasks: { orderBy: { createdAt: "desc" } },
    documents: { orderBy: { createdAt: "desc" } },
};
const listQuerySchema = zod_1.z.object({
    box: zod_1.z.enum(["incoming", "outgoing"]).default("incoming"),
});
// GET /tenants/:tenantId/consultant-referrals — the caller's own referral
// inbox (received) or outbox (sent), newest first.
exports.consultantReferralsRouter.get("/", async (req, res) => {
    const { box } = listQuerySchema.parse(req.query);
    const referrals = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownConsultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (!ownConsultantId) {
            throw new errorHandler_1.AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
        }
        const rows = await tx.consultantReferral.findMany({
            where: box === "incoming"
                ? { tenantId: req.params.tenantId, toConsultantId: ownConsultantId }
                : { tenantId: req.params.tenantId, fromConsultantId: ownConsultantId },
            orderBy: { createdAt: "desc" },
        });
        const consultantIds = [...new Set(rows.flatMap((r) => [r.fromConsultantId, r.toConsultantId]))];
        const clientIds = [...new Set(rows.map((r) => r.clientId))];
        const caseIds = [...new Set(rows.map((r) => r.sourceCaseId))];
        const [consultants, clients, cases] = await Promise.all([
            tx.consultantProfile.findMany({
                where: { id: { in: consultantIds } },
                select: { id: true, fullName: true },
            }),
            tx.clientProfile.findMany({
                where: { id: { in: clientIds } },
                select: { id: true, fullName: true },
            }),
            tx.case.findMany({
                where: { id: { in: caseIds } },
                select: { id: true, matterKey: true, category: true },
            }),
        ]);
        const consultantById = new Map(consultants.map((c) => [c.id, c]));
        const clientById = new Map(clients.map((c) => [c.id, c]));
        const caseById = new Map(cases.map((c) => [c.id, c]));
        return rows.map((r) => ({
            ...r,
            fromConsultant: consultantById.get(r.fromConsultantId) ?? null,
            toConsultant: consultantById.get(r.toConsultantId) ?? null,
            client: clientById.get(r.clientId) ?? null,
            sourceCase: caseById.get(r.sourceCaseId) ?? null,
        }));
    });
    res.json({ data: referrals });
});
// GET /tenants/:tenantId/consultant-referrals/:id — a single referral plus a
// readonly snapshot of the source case, for either the sender or the
// recipient. This is the "View" action from the inbox — never used to allow
// editing, so no ownership check beyond "one of the two parties".
exports.consultantReferralsRouter.get("/:id", async (req, res) => {
    const found = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const referral = await tx.consultantReferral.findUnique({ where: { id: req.params.id } });
        if (!referral || referral.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Referral not found", "REFERRAL_NOT_FOUND");
        }
        const ownConsultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (ownConsultantId !== referral.toConsultantId &&
            ownConsultantId !== referral.fromConsultantId) {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_REFERRAL_PARTY");
        }
        const [sourceCase, fromConsultant, toConsultant] = await Promise.all([
            tx.case.findUnique({ where: { id: referral.sourceCaseId }, include: caseSnapshotInclude }),
            tx.consultantProfile.findUnique({
                where: { id: referral.fromConsultantId },
                select: { id: true, fullName: true },
            }),
            tx.consultantProfile.findUnique({
                where: { id: referral.toConsultantId },
                select: { id: true, fullName: true },
            }),
        ]);
        if (!sourceCase) {
            throw new errorHandler_1.AppError(404, "Referral not found", "REFERRAL_NOT_FOUND");
        }
        return { ...referral, fromConsultant, toConsultant, case: sourceCase };
    });
    res.json({ data: found });
});
const declineSchema = zod_1.z
    .object({
    reason: zod_1.z.string().min(1).max(500),
})
    .strict();
// Shared lookup+validate step for both /accept and /decline: the referral
// must exist in this tenant, the caller must be the recipient, and it must
// still be PENDING.
async function loadPendingReferralForRecipient(tx, tenantId, referralId, userId) {
    const referral = await tx.consultantReferral.findUnique({ where: { id: referralId } });
    if (!referral || referral.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Referral not found", "REFERRAL_NOT_FOUND");
    }
    const ownConsultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, userId);
    if (ownConsultantId !== referral.toConsultantId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_REFERRAL_RECIPIENT");
    }
    if (referral.status !== "PENDING") {
        throw new errorHandler_1.AppError(409, "Referral already resolved", "REFERRAL_ALREADY_RESOLVED");
    }
    return referral;
}
// Shared dispatch step for both /accept and /decline: tells the sender what
// the recipient decided.
async function notifyReferralSender(tx, tenantId, referral, type, subject, body) {
    const [fromConsultant, toConsultant] = await Promise.all([
        tx.consultantProfile.findUnique({
            where: { id: referral.fromConsultantId },
            select: { userId: true },
        }),
        tx.consultantProfile.findUnique({
            where: { id: referral.toConsultantId },
            select: { fullName: true },
        }),
    ]);
    if (fromConsultant) {
        await (0, notification_service_1.dispatch)(tx, {
            tenantId,
            userId: fromConsultant.userId,
            type,
            message: { subject, body: body(toConsultant?.fullName ?? "Your colleague") },
        });
    }
}
// POST /tenants/:tenantId/consultant-referrals/:id/accept — recipient only.
// Auto-creates a new Case for the recipient, seeded from the source case's
// category/requirements plus the sender's context note (sprints.md Sprint
// 6.1 item 3). The original case/consultant is untouched — this is a fresh
// case, not a reassignment.
exports.consultantReferralsRouter.post("/:id/accept", async (req, res) => {
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const referral = await loadPendingReferralForRecipient(tx, req.params.tenantId, req.params.id, req.user.id);
        const sourceCase = await tx.case.findUnique({ where: { id: referral.sourceCaseId } });
        if (!sourceCase) {
            throw new errorHandler_1.AppError(404, "Source case not found", "CASE_NOT_FOUND");
        }
        const newCase = await tx.case.create({
            data: {
                tenantId: req.params.tenantId,
                clientId: referral.clientId,
                consultantId: referral.toConsultantId,
                category: sourceCase.category,
                matterKey: sourceCase.matterKey,
                requirementsSubject: sourceCase.requirementsSubject,
                requirements: referral.contextNote
                    ? `Referred case. Context from referring consultant: ${referral.contextNote}`
                    : "Referred case.",
            },
        });
        await tx.caseConsultantAssignment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: newCase.id,
                consultantId: referral.toConsultantId,
                role: "Primary Consultant",
            },
        });
        const result = await tx.consultantReferral.update({
            where: { id: referral.id },
            data: { status: "ACCEPTED", newCaseId: newCase.id, respondedAt: new Date() },
        });
        await notifyReferralSender(tx, req.params.tenantId, referral, "CASE_REFERRAL_ACCEPTED", "Referral accepted", (toConsultantName) => `${toConsultantName} accepted your case referral.`);
        // Fires alongside NEW_CLIENT (this is a brand-new Case, same as
        // cases.router.ts's create path) so a workflow can react to either the
        // referral itself or the resulting new case.
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "REFERRAL_ACCEPTED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, newCase.id)),
            referral: { id: referral.id },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "NEW_CLIENT", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, newCase.id)),
        });
        return { ...result, newCase };
    });
    res.json({ data: updated });
});
// POST /tenants/:tenantId/consultant-referrals/:id/decline — recipient only.
// A reason is required so the sender knows why, unlike the sprints.md
// baseline ("just closes the request") which didn't call for one.
exports.consultantReferralsRouter.post("/:id/decline", async (req, res) => {
    const body = declineSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const referral = await loadPendingReferralForRecipient(tx, req.params.tenantId, req.params.id, req.user.id);
        const result = await tx.consultantReferral.update({
            where: { id: referral.id },
            data: { status: "DECLINED", declineReason: body.reason, respondedAt: new Date() },
        });
        await notifyReferralSender(tx, req.params.tenantId, referral, "CASE_REFERRAL_DECLINED", "Referral declined", (toConsultantName) => `${toConsultantName} declined your case referral: ${body.reason}`);
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "REFERRAL_DECLINED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, referral.sourceCaseId)),
            referral: { id: referral.id, declineReason: body.reason },
        });
        return result;
    });
    res.json({ data: updated });
});
//# sourceMappingURL=consultant-referrals.router.js.map