"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outOfOfficeRouter = exports.availabilitySlotsRouter = exports.verificationDocumentsRouter = exports.consultantsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
// data_api_v4.md §8 — consultant_profiles, availability_slots,
// out_of_office_periods. Mounted at /api/tenants/:tenantId/consultants.
exports.consultantsRouter = (0, express_1.Router)({ mergeParams: true });
exports.consultantsRouter.use(require_tenant_match_1.requireTenantMatch);
// GET /tenants/:tenantId/consultants — CLIENT sees only consultants
// currently accepting new clients (booking-relevant); TENANT_ADMIN,
// SUPER_ADMIN and CONSULTANT see the full tenant roster.
exports.consultantsRouter.get("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT", "CLIENT"), async (req, res) => {
    const today = new Date();
    const consultants = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.consultantProfile.findMany({
        where: {
            tenantId: req.params.tenantId,
            ...(req.user.role === "CLIENT" && { isAcceptingNewClients: true }),
        },
        include: {
            user: { select: { email: true, accountStatus: true } },
            _count: { select: { cases: true } },
            outOfOfficePeriods: {
                where: { startDate: { lte: today }, endDate: { gte: today } },
                select: { id: true },
                take: 1,
            },
        },
    }));
    res.json({ data: consultants });
});
const createConsultantSchema = zod_1.z
    .object({
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string().min(1).max(200),
    category: zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
})
    .strict();
// POST /tenants/:tenantId/consultants — invites a Consultant: creates users
// (role=CONSULTANT) + consultant_profiles. invitedBy is set server-side.
exports.consultantsRouter.post("/", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createConsultantSchema.parse(req.body);
    const { data: invited, error: inviteError } = await supabaseAdmin_1.supabaseAdmin.auth.admin.inviteUserByEmail(body.email);
    if (inviteError || !invited.user) {
        throw new errorHandler_1.AppError(502, `Failed to invite consultant: ${inviteError?.message ?? "unknown error"}`, "INVITE_FAILED");
    }
    const profile = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => tx.user.create({
        data: {
            supabaseAuthUserId: invited.user.id,
            tenantId: req.params.tenantId,
            role: "CONSULTANT",
            email: body.email,
            consultantProfile: {
                create: {
                    tenantId: req.params.tenantId,
                    fullName: body.fullName,
                    category: body.category,
                    invitedBy: req.user.id,
                },
            },
        },
        include: { consultantProfile: true },
    }));
    res.status(201).json({ data: profile });
});
async function findConsultant(tx, tenantId, consultantId) {
    const consultant = await tx.consultantProfile.findUnique({ where: { id: consultantId } });
    if (!consultant || consultant.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
    }
    return consultant;
}
function assertSelfMatchesOrAdmin(req, ownConsultantId, consultantId) {
    if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN")
        return;
    if (ownConsultantId !== consultantId)
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
}
// GET /tenants/:tenantId/consultants/:consultantId
exports.consultantsRouter.get("/:consultantId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"), async (req, res) => {
    const consultant = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        const found = await tx.consultantProfile.findUnique({
            where: { id: req.params.consultantId },
            include: {
                user: { select: { email: true, accountStatus: true } },
                _count: { select: { cases: true } },
            },
        });
        if (!found || found.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        return found;
    });
    res.json({ data: consultant });
});
const patchConsultantSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(200).optional(),
    category: zod_1.z
        .enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"])
        .optional(),
    bio: zod_1.z.string().optional(),
    consultationFee: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    languagesSpoken: zod_1.z.array(zod_1.z.string()).optional(),
    subSpecialization: zod_1.z.string().max(150).optional(),
    isAcceptingNewClients: zod_1.z.boolean().optional(),
    autoApproveBookings: zod_1.z.boolean().optional(),
    paymentTiming: zod_1.z.enum(["PAY_ON_BOOKING", "PAY_AFTER_SESSION"]).optional(),
})
    .strict();
// PATCH /tenants/:tenantId/consultants/:consultantId — self, TENANT_ADMIN, SUPER_ADMIN.
exports.consultantsRouter.patch("/:consultantId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const updates = patchConsultantSchema.parse(req.body);
    const consultant = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.consultantProfile.update({ where: { id: req.params.consultantId }, data: updates });
    });
    res.json({ data: consultant });
});
// DELETE /tenants/:tenantId/consultants/:consultantId — deactivates only
// (via the linked User's accountStatus; case history is never deleted —
// consultant_profiles itself carries no status column).
exports.consultantsRouter.delete("/:consultantId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const consultant = await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        await tx.user.update({
            where: { id: consultant.userId },
            data: { accountStatus: "SUSPENDED" },
        });
    });
    res.status(204).send();
});
// GET /tenants/:tenantId/consultants/:consultantId/verification-documents —
// self, TENANT_ADMIN. Display-only read; no platform approval workflow
// exists (schema §3.25).
exports.consultantsRouter.get("/:consultantId/verification-documents", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const documents = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.consultantVerificationDocument.findMany({
            where: { consultantId: req.params.consultantId },
        });
    });
    res.json({ data: documents });
});
// GET /tenants/:tenantId/consultants/:consultantId/commitments — self only.
// Not in data_api_v4.md §14, which only defines per-case commitment reads
// (/cases/:caseId/commitments) — this aggregate mirrors the same
// spec-deviation precedent as appointmentsRouter's tenant-wide GET /, added
// because the consultant dashboard's "Critical Commitments" widget needs a
// single cross-case worklist rather than one request per case.
exports.consultantsRouter.get("/:consultantId/commitments", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const commitments = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (ownId !== req.params.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        return tx.commitment.findMany({
            where: { status: "ACTIVE", case: { consultantId: req.params.consultantId } },
            include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
            orderBy: { createdAt: "asc" },
        });
    });
    res.json({ data: commitments });
});
// GET /tenants/:tenantId/consultants/:consultantId/tasks — self only. Same
// spec-deviation precedent as the commitments aggregate above; data_api_v4.md
// §14 only defines /cases/:caseId/tasks.
exports.consultantsRouter.get("/:consultantId/tasks", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const tasks = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
        if (ownId !== req.params.consultantId)
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_PROFILE");
        return tx.task.findMany({
            where: {
                assignedTo: "CONSULTANT",
                status: { in: ["OPEN", "OVERDUE"] },
                case: { consultantId: req.params.consultantId },
            },
            include: { case: { select: { id: true, client: { select: { fullName: true } } } } },
            orderBy: { dueAt: { sort: "asc", nulls: "last" } },
        });
    });
    res.json({ data: tasks });
});
// data_api_v4.md §8 puts this route at
// /tenants/:tenantId/verification-documents/:docId, a sibling of
// /consultants rather than nested under it — exported separately so
// index.ts can mount it at the matching path.
exports.verificationDocumentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.verificationDocumentsRouter.use(require_tenant_match_1.requireTenantMatch);
// DELETE /tenants/:tenantId/verification-documents/:docId — self, TENANT_ADMIN.
exports.verificationDocumentsRouter.delete("/:docId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const doc = await tx.consultantVerificationDocument.findUnique({
            where: { id: req.params.docId },
        });
        if (!doc || doc.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, doc.consultantId);
        }
        await tx.consultantVerificationDocument.delete({ where: { id: req.params.docId } });
    });
    res.status(204).send();
});
const availabilityQuerySchema = zod_1.z.object({
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
// GET /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN (all fields); public open-slot projection is handled by a
// separate unauthenticated route (data_api_v4.md §9), not this one.
exports.consultantsRouter.get("/:consultantId/availability", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const query = availabilityQuerySchema.parse(req.query);
    const slots = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.availabilitySlot.findMany({
            where: {
                consultantId: req.params.consultantId,
                ...((query.from || query.to) && {
                    specificDate: {
                        ...(query.from && { gte: new Date(query.from) }),
                        ...(query.to && { lte: new Date(query.to) }),
                    },
                }),
            },
        });
    });
    res.json({ data: slots });
});
const createSlotSchema = zod_1.z.union([
    zod_1.z
        .object({
        dayOfWeek: zod_1.z.number().int().min(0).max(6),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        slotDurationMins: zod_1.z.number().int().min(5).optional(),
    })
        .strict(),
    zod_1.z
        .object({
        specificDate: zod_1.z.string(),
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        slotDurationMins: zod_1.z.number().int().min(5).optional(),
    })
        .strict(),
]);
const createSlotsBodySchema = zod_1.z.union([createSlotSchema, zod_1.z.array(createSlotSchema)]);
// POST /tenants/:tenantId/consultants/:consultantId/availability — self,
// TENANT_ADMIN. Supports a bulk array body ("block this week").
exports.consultantsRouter.post("/:consultantId/availability", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = createSlotsBodySchema.parse(req.body);
    const inputs = Array.isArray(body) ? body : [body];
    const slots = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return Promise.all(inputs.map((input) => tx.availabilitySlot.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId: req.params.consultantId,
                dayOfWeek: "dayOfWeek" in input ? input.dayOfWeek : undefined,
                specificDate: "specificDate" in input ? new Date(input.specificDate) : undefined,
                startTime: new Date(`1970-01-01T${input.startTime}`),
                endTime: new Date(`1970-01-01T${input.endTime}`),
                ...(input.slotDurationMins && { slotDurationMins: input.slotDurationMins }),
            },
        })));
    });
    res.status(201).json({ data: slots });
});
const patchSlotSchema = zod_1.z
    .object({
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
    status: zod_1.z.enum(["OPEN", "BOOKED", "BLOCKED"]).optional(),
})
    .strict();
// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/availability-slots/:slotId, a sibling of /consultants
// rather than nested under it — exported separately so index.ts can mount
// it at the matching path.
exports.availabilitySlotsRouter = (0, express_1.Router)({ mergeParams: true });
exports.availabilitySlotsRouter.use(require_tenant_match_1.requireTenantMatch);
// PATCH /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
exports.availabilitySlotsRouter.patch("/:slotId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = patchSlotSchema.parse(req.body);
    const slot = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Slot not found", "SLOT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        return tx.availabilitySlot.update({
            where: { id: req.params.slotId },
            data: {
                ...(body.startTime && { startTime: new Date(`1970-01-01T${body.startTime}`) }),
                ...(body.endTime && { endTime: new Date(`1970-01-01T${body.endTime}`) }),
                ...(body.status && { status: body.status }),
                version: { increment: 1 },
            },
        });
    });
    res.json({ data: slot });
});
// DELETE /tenants/:tenantId/availability-slots/:slotId — self, TENANT_ADMIN.
// Blocked with 409 if BOOKED unless ?force=true.
exports.availabilitySlotsRouter.delete("/:slotId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const force = req.query.force === "true";
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Slot not found", "SLOT_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        if (target.status === "BOOKED" && !force) {
            throw new errorHandler_1.AppError(409, "Slot is booked; pass ?force=true to override", "SLOT_BOOKED");
        }
        await tx.availabilitySlot.delete({ where: { id: req.params.slotId } });
    });
    res.status(204).send();
});
// GET /tenants/:tenantId/consultants/:consultantId/out-of-office
exports.consultantsRouter.get("/:consultantId/out-of-office", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const periods = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.outOfOfficePeriod.findMany({ where: { consultantId: req.params.consultantId } });
    });
    res.json({ data: periods });
});
const createOooSchema = zod_1.z
    .object({
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    autoReplyMessage: zod_1.z.string().optional(),
    pausesNewBookings: zod_1.z.boolean().optional(),
})
    .strict();
// POST /tenants/:tenantId/consultants/:consultantId/out-of-office
exports.consultantsRouter.post("/:consultantId/out-of-office", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = createOooSchema.parse(req.body);
    const period = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        await findConsultant(tx, req.params.tenantId, req.params.consultantId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, req.params.consultantId);
        }
        return tx.outOfOfficePeriod.create({
            data: {
                tenantId: req.params.tenantId,
                consultantId: req.params.consultantId,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                autoReplyMessage: body.autoReplyMessage,
                ...(body.pausesNewBookings !== undefined && {
                    pausesNewBookings: body.pausesNewBookings,
                }),
            },
        });
    });
    res.status(201).json({ data: period });
});
const patchOooSchema = zod_1.z
    .object({
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    autoReplyMessage: zod_1.z.string().optional(),
    pausesNewBookings: zod_1.z.boolean().optional(),
})
    .strict();
async function findOoo(tx, tenantId, oooId) {
    const period = await tx.outOfOfficePeriod.findUnique({ where: { id: oooId } });
    if (!period || period.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Out-of-office period not found", "OOO_NOT_FOUND");
    }
    return period;
}
// data_api_v4.md §8 puts these two routes at
// /tenants/:tenantId/out-of-office/:oooId, a sibling of /consultants rather
// than nested under it — exported separately so index.ts can mount it at
// the matching path.
exports.outOfOfficeRouter = (0, express_1.Router)({ mergeParams: true });
exports.outOfOfficeRouter.use(require_tenant_match_1.requireTenantMatch);
// PATCH /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
exports.outOfOfficeRouter.patch("/:oooId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = patchOooSchema.parse(req.body);
    const period = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        return tx.outOfOfficePeriod.update({
            where: { id: req.params.oooId },
            data: {
                ...(body.startDate && { startDate: new Date(body.startDate) }),
                ...(body.endDate && { endDate: new Date(body.endDate) }),
                ...(body.autoReplyMessage !== undefined && { autoReplyMessage: body.autoReplyMessage }),
                ...(body.pausesNewBookings !== undefined && {
                    pausesNewBookings: body.pausesNewBookings,
                }),
            },
        });
    });
    res.json({ data: period });
});
// DELETE /tenants/:tenantId/out-of-office/:oooId — self, TENANT_ADMIN.
exports.outOfOfficeRouter.delete("/:oooId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await findOoo(tx, req.params.tenantId, req.params.oooId);
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            assertSelfMatchesOrAdmin(req, ownId, target.consultantId);
        }
        await tx.outOfOfficePeriod.delete({ where: { id: req.params.oooId } });
    });
    res.status(204).send();
});
//# sourceMappingURL=consultants.router.js.map