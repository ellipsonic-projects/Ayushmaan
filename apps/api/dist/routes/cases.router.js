"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.casesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const booking_service_1 = require("../services/booking.service");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("../lib/callerProfile");
const cases_service_1 = require("../services/cases.service");
const audit_service_1 = require("../services/audit.service");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
const caseDetailInclude = {
    client: {
        select: {
            fullName: true,
            user: { select: { email: true, phone: true } },
        },
    },
    consultant: { select: { id: true, fullName: true } },
    assignments: {
        orderBy: { startedAt: "desc" },
        include: { consultant: { select: { id: true, fullName: true } } },
    },
    appointments: { orderBy: { scheduledStart: "desc" } },
    interactions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    commitments: { orderBy: { createdAt: "desc" } },
    tasks: { orderBy: { createdAt: "desc" } },
    documents: { orderBy: { createdAt: "desc" } },
    // accessToken deliberately omitted — it's only ever needed by the public
    // fill link generated at send time (form-submissions.router.ts), never by
    // an authenticated case-detail read.
    formSubmissions: {
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            status: true,
            channel: true,
            answers: true,
            submittedAt: true,
            createdAt: true,
            formTemplate: { select: { name: true, jsonSchema: true, uiSchema: true } },
        },
    },
};
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
    status: zod_1.z.enum(["PENDING_ASSIGNMENT", "ACTIVE", "ON_HOLD", "CLOSED"]).optional(),
    tag: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
// GET /tenants/:tenantId/cases — CONSULTANT (own only), TENANT_ADMIN
// (metadata only, not notes — this slice has no note content yet anyway),
// SUPER_ADMIN (any tenant, audit-logged, same rationale as GET /:caseId).
exports.casesRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    if (req.user.role === "SUPER_ADMIN") {
        const cases = await (0, cases_service_1.listCasesAuditedForSuperAdmin)(req.params.tenantId, req.user.id);
        return res.json({ data: cases });
    }
    const query = listCasesQuerySchema.parse(req.query);
    const cases = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const where = {
            tenantId: req.params.tenantId,
            status: query.status,
            deletedAt: null,
            ...(query.tag && { tags: { has: query.tag } }),
        };
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (!consultantId)
                return [];
            const own = await tx.consultantProfile.findUnique({ where: { id: consultantId } });
            delete where.status;
            // Own cases (any status) plus unassigned requests in this consultant's
            // field, so the queue view can offer them to "Take" — no one manually
            // matches a client to a specific consultant anymore.
            where.OR = [
                { consultantId, ...(query.status && { status: query.status }) },
                {
                    consultantId: null,
                    status: query.status ?? "PENDING_ASSIGNMENT",
                    category: own?.category,
                },
            ];
        }
        if (query.search) {
            where.matterKey = { contains: query.search, mode: "insensitive" };
        }
        return tx.case.findMany({
            where,
            select: {
                id: true,
                matterKey: true,
                category: true,
                tags: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                client: { select: { fullName: true } },
                consultant: { select: { fullName: true } },
                _count: {
                    select: { interactions: true, commitments: true, tasks: true, documents: true },
                },
            },
        });
    });
    res.json({ data: cases });
});
const createCaseSchema = zod_1.z
    .object({
    clientId: zod_1.z.string().uuid(),
    category: zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
    matterKey: zod_1.z.string().max(150).optional(),
    requirementsSubject: zod_1.z.string().max(200).optional(),
    requirements: zod_1.z.string().max(2000).optional(),
    // Only honored for TENANT_ADMIN callers — a Consultant can never create
    // a case on another consultant's behalf, so this is ignored for them.
    consultantId: zod_1.z.string().uuid().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases — CONSULTANT (consultantId forced to the
// caller's own profile id), or TENANT_ADMIN/SUPER_ADMIN booking a client
// against a consultant of their choosing (consultantId required in the body).
exports.casesRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = createCaseSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        let consultantId;
        if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") {
            if (!body.consultantId) {
                throw new errorHandler_1.AppError(400, "consultantId is required", "CONSULTANT_ID_REQUIRED");
            }
            const consultant = await tx.consultantProfile.findUnique({
                where: { id: body.consultantId },
            });
            if (!consultant || consultant.tenantId !== req.params.tenantId) {
                throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
            }
            consultantId = consultant.id;
        }
        else {
            const ownConsultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (!ownConsultantId)
                throw new errorHandler_1.AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
            consultantId = ownConsultantId;
        }
        // Clients are platform-level — no tenant check here, and this may be
        // the client's first Case in this tenant at all, so client_profiles'
        // "has a Case in this tenant" RLS clause can't apply yet. Look the
        // client up with an elevated context (mirrors clients.router.ts's
        // invite-reuse lookup) purely to confirm the id is real.
        const client = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (superTx) => superTx.clientProfile.findUnique({ where: { id: body.clientId } }));
        if (!client) {
            throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
        }
        // CONSULTANT dedupes onto an existing open case (createOrReuseCase,
        // shared with POST /consultants/:consultantId/appointments — see
        // instructions.md §1); TENANT_ADMIN/SUPER_ADMIN keep the always-create
        // behavior since they aren't the "pick a client" flow this applies to.
        const { case: created, isNew } = await (0, booking_service_1.createOrReuseCase)(tx, {
            tenantId: req.params.tenantId,
            clientId: body.clientId,
            consultantId,
            category: body.category,
            matterKey: body.matterKey,
            requirementsSubject: body.requirementsSubject,
            requirements: body.requirements,
            dedupe: req.user.role === "CONSULTANT",
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "CREATE",
                entityType: "Case",
                entityId: created.id,
            });
        }
        // First case for this client-consultant pair (not a dedupe reuse) —
        // the "new client" moment a consultant's workflow can hook a
        // SEND_INTAKE_FORM node onto via an EVENT trigger.
        if (isNew) {
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "NEW_CLIENT", await (0, workflow_context_1.buildCaseContext)(tx, created.id));
        }
        return created;
    });
    res.status(201).json({ data: created });
});
const requestCaseSchema = zod_1.z
    .object({
    category: zod_1.z.enum(["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"]),
    matterKey: zod_1.z.string().max(150).optional(),
    requirementsSubject: zod_1.z.string().max(200).optional(),
    requirements: zod_1.z.string().max(2000).optional(),
    scheduledStart: zod_1.z.string().datetime(),
    scheduledEnd: zod_1.z.string().datetime(),
    meetingLink: zod_1.z.string().url().optional(),
    // Books on behalf of a linked dependent (guardian_links, schema §3.7)
    // instead of the caller's own profile — omit to book for oneself.
    // CLIENT-only; ignored for TENANT_ADMIN/SUPER_ADMIN callers.
    onBehalfOfClientId: zod_1.z.string().uuid().optional(),
    // Required for TENANT_ADMIN/SUPER_ADMIN callers (booking on behalf of a
    // client that was just created) — ignored for CLIENT, who always books
    // for themselves or a dependent via onBehalfOfClientId above.
    clientId: zod_1.z.string().uuid().optional(),
    // The consultant the client picked directly from GET /clients/consultants
    // (CLIENT-only; ignored for TENANT_ADMIN/SUPER_ADMIN). When given, the
    // Case is created already assigned to that consultant instead of an
    // unclaimed PENDING_ASSIGNMENT shell — see below.
    consultantId: zod_1.z.string().uuid().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/request — CLIENT booking against an
// organization with a consultant they picked from the directory
// (GET /clients/consultants), or a TENANT_ADMIN/SUPER_ADMIN entering a
// request for a client who called in. When `consultantId` is given, the Case
// is created directly ACTIVE and assigned to that consultant; otherwise it
// opens an unclaimed PENDING_ASSIGNMENT shell Case (plus its first REQUESTED
// Appointment either way) that a TENANT_ADMIN approves via PATCH
// /appointments/:id, and any consultant serving that field can then claim via
// POST /:caseId/assign-consultant.
exports.casesRouter.post("/request", (0, require_role_1.requireRole)("CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = requestCaseSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        let clientId;
        if (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN") {
            if (!body.clientId) {
                throw new errorHandler_1.AppError(400, "clientId is required", "CLIENT_ID_REQUIRED");
            }
            // Elevated lookup — mirrors POST /cases above: this may be the
            // client's first Case in this tenant, so the RLS "has a Case in this
            // tenant" clause can't apply yet.
            const client = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: req.user.id }, (superTx) => superTx.clientProfile.findUnique({ where: { id: body.clientId } }));
            if (!client) {
                throw new errorHandler_1.AppError(404, "Client not found", "CLIENT_NOT_FOUND");
            }
            clientId = body.clientId;
        }
        else {
            const ownId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
            if (!ownId) {
                throw new errorHandler_1.AppError(403, "No client profile for this account", "NO_CLIENT_PROFILE");
            }
            clientId = ownId;
            if (body.onBehalfOfClientId && body.onBehalfOfClientId !== ownId) {
                const accessible = await (0, callerProfile_1.isClientProfileAccessibleToUser)(tx, req.user.id, body.onBehalfOfClientId);
                if (!accessible)
                    throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_OR_DEPENDENT_PROFILE");
                clientId = body.onBehalfOfClientId;
            }
        }
        let consultantId = null;
        if (req.user.role === "CLIENT" && body.consultantId) {
            const consultant = await tx.consultantProfile.findUnique({
                where: { id: body.consultantId },
            });
            if (!consultant || consultant.tenantId !== req.params.tenantId) {
                throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
            }
            if (consultant.category !== body.category) {
                throw new errorHandler_1.AppError(409, "Consultant does not serve this case's field", "CATEGORY_MISMATCH");
            }
            consultantId = consultant.id;
        }
        const newCase = await tx.case.create({
            data: {
                tenantId: req.params.tenantId,
                clientId,
                consultantId,
                category: body.category,
                matterKey: body.matterKey,
                requirementsSubject: body.requirementsSubject,
                requirements: body.requirements,
                status: consultantId ? "ACTIVE" : "PENDING_ASSIGNMENT",
            },
        });
        if (consultantId) {
            await tx.caseConsultantAssignment.create({
                data: {
                    tenantId: req.params.tenantId,
                    caseId: newCase.id,
                    consultantId,
                },
            });
            // A PENDING_ASSIGNMENT case (no consultantId yet) has no one to
            // conflict-check against — assignment happens later.
            await (0, booking_service_1.assertNoConflict)(tx, {
                consultantId,
                scheduledStart: new Date(body.scheduledStart),
                scheduledEnd: new Date(body.scheduledEnd),
            });
            await (0, booking_service_1.assertNoSameDayAppointmentWithConsultant)(tx, {
                clientId,
                consultantId,
                scheduledStart: new Date(body.scheduledStart),
            });
        }
        const appointment = await tx.appointment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: newCase.id,
                scheduledStart: new Date(body.scheduledStart),
                scheduledEnd: new Date(body.scheduledEnd),
                meetingLink: body.meetingLink,
            },
        });
        // This path always creates a brand-new Case (no dedupe concept, unlike
        // POST / above) and its first Appointment — fire both moments so a
        // workflow watching either one fires the same as it would for the
        // POST /cases + POST /appointments paths.
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "NEW_CLIENT", await (0, workflow_context_1.buildCaseContext)(tx, newCase.id));
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "APPOINTMENT_BOOKED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, newCase.id)),
            appointment: {
                id: appointment.id,
                scheduledStart: appointment.scheduledStart.toISOString(),
                scheduledEnd: appointment.scheduledEnd.toISOString(),
                status: appointment.status,
            },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "CREATE",
                entityType: "Case",
                entityId: newCase.id,
            });
        }
        return { case: newCase, appointment };
    });
    res.status(201).json({ data: created });
});
const assignConsultantSchema = zod_1.z
    .object({
    // Only honored for TENANT_ADMIN/SUPER_ADMIN callers — a CONSULTANT always
    // claims the case for themselves (see below), so this is ignored for them.
    consultantId: zod_1.z.string().uuid().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/assign-consultant — TENANT_ADMIN,
// SUPER_ADMIN (support override), or CONSULTANT claiming an unassigned
// booking request for themselves ("Take" in the consultant's queue). This is
// only reached for requests where the client didn't pick a consultant
// upfront (POST /cases/request without `consultantId` — e.g. a TENANT_ADMIN
// entering a call-in booking) and so still sit PENDING_ASSIGNMENT; a client
// who picked a consultant directly from GET /clients/consultants is already
// ACTIVE and assigned by the time this route would apply. Cases that already
// have a consultant go through /reassign instead.
exports.casesRouter.post("/:caseId/assign-consultant", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN", "CONSULTANT"), async (req, res) => {
    const body = assignConsultantSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        if (target.status !== "PENDING_ASSIGNMENT" || target.consultantId) {
            throw new errorHandler_1.AppError(409, "Case already has a consultant — use /reassign", "CASE_ALREADY_ASSIGNED");
        }
        let consultantId;
        if (req.user.role === "CONSULTANT") {
            const ownId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (!ownId) {
                throw new errorHandler_1.AppError(403, "No consultant profile for this account", "NO_CONSULTANT_PROFILE");
            }
            consultantId = ownId;
        }
        else {
            if (!body.consultantId) {
                throw new errorHandler_1.AppError(400, "consultantId is required", "CONSULTANT_ID_REQUIRED");
            }
            consultantId = body.consultantId;
        }
        const consultant = await tx.consultantProfile.findUnique({
            where: { id: consultantId },
        });
        if (!consultant || consultant.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        if (consultant.category !== target.category) {
            throw new errorHandler_1.AppError(409, "Consultant does not serve this case's field", "CATEGORY_MISMATCH");
        }
        const result = await tx.case.update({
            where: { id: target.id },
            data: { consultantId, status: "ACTIVE" },
            include: caseDetailInclude,
        });
        await tx.caseConsultantAssignment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: target.id,
                consultantId,
            },
        });
        await tx.appointment.updateMany({
            where: { caseId: target.id, status: "REQUESTED" },
            data: { status: "ADMIN_APPROVED" },
        });
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: req.params.tenantId,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            isCrossTenantAccess: req.user.role === "SUPER_ADMIN",
            action: req.user.role === "CONSULTANT" ? "CLAIM_CASE" : "ASSIGN_CONSULTANT",
            entityType: "Case",
            entityId: target.id,
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CASE_ASSIGNED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, target.id)),
            assignment: { consultantId },
        });
        return result;
    });
    res.json({ data: updated });
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
        const target = await tx.case.findUnique({
            where: { id: req.params.caseId },
            include: caseDetailInclude,
        });
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
        // A CLIENT response strips any nested interactions/documents that
        // aren't shared, per docs/api-patterns.md §10 — never a render-layer
        // filter, so a private note can't leak through this endpoint.
        const scoped = req.user.role === "CLIENT"
            ? {
                ...target,
                interactions: target.interactions.filter((i) => i.isClientVisible),
                documents: target.documents.filter((d) => d.isClientVisible),
            }
            : target;
        // Pre-existing cases created before assignment history existed have no
        // rows yet — synthesize (not persisted) a single "current" entry from
        // the case's own consultant/createdAt so the UI always has something.
        if (scoped.assignments.length === 0) {
            return {
                ...scoped,
                assignments: [
                    {
                        id: `synthetic-${target.id}`,
                        tenantId: target.tenantId,
                        caseId: target.id,
                        consultantId: target.consultantId,
                        role: "Primary Consultant",
                        startedAt: target.createdAt,
                        endedAt: null,
                        endReason: null,
                        consultant: target.consultant,
                    },
                ],
            };
        }
        return scoped;
    });
    res.json({ data: found });
});
// Sprint 4.1 scope only allows a consultant to move a case between ACTIVE
// and CLOSED via this route — PENDING_ASSIGNMENT/ON_HOLD are set elsewhere
// (assign-consultant, out-of-office flows), not through this general PATCH.
const allowedStatusTransitions = {
    ACTIVE: ["CLOSED"],
    CLOSED: ["ACTIVE"],
};
const updateCaseSchema = zod_1.z
    .object({
    requirements: zod_1.z.string().max(2000).optional(),
    tags: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(50).optional(),
    status: zod_1.z.enum(["ACTIVE", "CLOSED"]).optional(),
})
    .strict();
// PATCH /tenants/:tenantId/cases/:caseId — CONSULTANT (own case),
// TENANT_ADMIN, SUPER_ADMIN. Updates the free-text requirements brief,
// the consultant's own tags[] (full replace), and/or transitions status
// between ACTIVE and CLOSED.
exports.casesRouter.patch("/:caseId", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const body = updateCaseSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (consultantId !== target.consultantId) {
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
            }
        }
        if (body.status && body.status !== target.status) {
            const allowed = allowedStatusTransitions[target.status] ?? [];
            if (!allowed.includes(body.status)) {
                throw new errorHandler_1.AppError(422, `Cannot transition case from ${target.status} to ${body.status}`, "INVALID_STATUS_TRANSITION");
            }
        }
        const result = await tx.case.update({
            where: { id: req.params.caseId },
            data: {
                ...(body.requirements !== undefined && { requirements: body.requirements }),
                ...(body.tags !== undefined && { tags: body.tags }),
                ...(body.status !== undefined && { status: body.status }),
            },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "UPDATE",
                entityType: "Case",
                entityId: req.params.caseId,
            });
        }
        if (body.status && body.status !== target.status) {
            const eventName = body.status === "CLOSED" ? "CASE_CLOSED" : "CASE_REOPENED";
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, eventName, await (0, workflow_context_1.buildCaseContext)(tx, req.params.caseId));
        }
        return result;
    });
    res.json({ data: updated });
});
// DELETE /tenants/:tenantId/cases/:caseId — TENANT_ADMIN, SUPER_ADMIN.
// Soft-deletes via deletedAt; case history (interactions, appointments,
// documents) is never removed.
exports.casesRouter.delete("/:caseId", (0, require_role_1.requireRole)("TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        // Context must be built before the soft-delete — buildCaseContext
        // reads the Case row back via findUniqueOrThrow, which would no
        // longer resolve consistently once deletedAt is set.
        const context = await (0, workflow_context_1.buildCaseContext)(tx, req.params.caseId);
        await tx.case.update({
            where: { id: req.params.caseId },
            data: { deletedAt: new Date() },
        });
        if (req.user.role === "SUPER_ADMIN") {
            await (0, audit_service_1.writeAuditLog)(tx, {
                tenantId: req.params.tenantId,
                actorUserId: req.user.id,
                actorRole: "SUPER_ADMIN",
                isCrossTenantAccess: true,
                action: "DELETE",
                entityType: "Case",
                entityId: req.params.caseId,
            });
        }
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CASE_DELETED", context);
    });
    res.status(204).send();
});
const reassignCaseSchema = zod_1.z
    .object({
    consultantId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().max(500).optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/reassign — CONSULTANT (must be the
// case's current consultant) or TENANT_ADMIN. Closes the current assignment
// row and opens a new one; Case.consultantId always mirrors the current row.
exports.casesRouter.post("/:caseId/reassign", (0, require_role_1.requireRole)("CONSULTANT", "TENANT_ADMIN"), async (req, res) => {
    const body = reassignCaseSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const target = await tx.case.findUnique({ where: { id: req.params.caseId } });
        if (!target || target.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
        }
        if (!target.consultantId) {
            throw new errorHandler_1.AppError(409, "Case has no consultant yet — use assign-consultant", "CASE_PENDING_ASSIGNMENT");
        }
        if (req.user.role === "CONSULTANT") {
            const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, req.user.id);
            if (consultantId !== target.consultantId) {
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
            }
        }
        const newConsultant = await tx.consultantProfile.findUnique({
            where: { id: body.consultantId },
        });
        if (!newConsultant || newConsultant.tenantId !== req.params.tenantId) {
            throw new errorHandler_1.AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
        }
        const currentAssignment = await tx.caseConsultantAssignment.findFirst({
            where: { caseId: target.id, endedAt: null },
            orderBy: { startedAt: "desc" },
        });
        if (currentAssignment) {
            await tx.caseConsultantAssignment.update({
                where: { id: currentAssignment.id },
                data: { endedAt: new Date(), endReason: body.reason },
            });
        }
        else {
            // Backfill the missing historical row for pre-existing cases before
            // closing it, so the history stays complete going forward.
            await tx.caseConsultantAssignment.create({
                data: {
                    tenantId: req.params.tenantId,
                    caseId: target.id,
                    consultantId: target.consultantId,
                    startedAt: target.createdAt,
                    endedAt: new Date(),
                    endReason: body.reason,
                },
            });
        }
        await tx.caseConsultantAssignment.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: target.id,
                consultantId: body.consultantId,
            },
        });
        const result = await tx.case.update({
            where: { id: target.id },
            data: { consultantId: body.consultantId },
            include: caseDetailInclude,
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "CASE_REASSIGNED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, target.id)),
            reassignment: { toConsultantId: body.consultantId, reason: body.reason },
        });
        return result;
    });
    res.json({ data: updated });
});
//# sourceMappingURL=cases.router.js.map