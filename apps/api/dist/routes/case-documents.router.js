"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseDocumentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const callerProfile_1 = require("../lib/callerProfile");
const audit_service_1 = require("../services/audit.service");
const storage_1 = require("../integrations/storage");
const workflow_context_1 = require("../lib/workflow-context");
const workflow_events_1 = require("../lib/workflow-events");
// Mounted at /api/tenants/:tenantId/cases/:caseId/documents.
exports.caseDocumentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseDocumentsRouter.use(require_tenant_match_1.requireTenantMatch);
// CONSULTANT must own the case; CLIENT must be the case's own client;
// TENANT_ADMIN may act on any case in their own tenant (e.g. attaching a
// document while booking an appointment on a client's behalf); SUPER_ADMIN
// may read any case's documents, cross-tenant, audit-logged (same rationale
// as cases.router.ts's GET /:caseId).
async function loadCaseForDocuments(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    if (req.user.role === "TENANT_ADMIN") {
        return found;
    }
    if (req.user.role === "SUPER_ADMIN") {
        await (0, audit_service_1.writeAuditLog)(tx, {
            tenantId: req.params.tenantId,
            actorUserId: req.user.id,
            actorRole: "SUPER_ADMIN",
            isCrossTenantAccess: true,
            action: "READ",
            entityType: "Case",
            entityId: found.id,
        });
        return found;
    }
    const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
    if (clientId !== found.clientId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
    }
    return found;
}
async function findDocument(tx, tenantId, caseId, documentId) {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.tenantId !== tenantId || doc.caseId !== caseId || doc.deletedAt) {
        throw new errorHandler_1.AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
    }
    return doc;
}
// GET /tenants/:tenantId/cases/:caseId/documents — CONSULTANT (own case, all
// non-deleted docs), CLIENT (own case, isClientVisible only), TENANT_ADMIN
// (own tenant, e.g. reviewing what a client attached while booking), SUPER_ADMIN
// (any tenant, audit-logged via loadCaseForDocuments).
exports.caseDocumentsRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const docs = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForDocuments(tx, req);
        return tx.document.findMany({
            where: {
                caseId: caseRow.id,
                deletedAt: null,
                ...(req.user.role === "CLIENT" && { isClientVisible: true }),
            },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: docs });
});
const uploadUrlSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().min(1).max(255),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/documents/upload-url — CONSULTANT
// (own case), self (CLIENT, own case), TENANT_ADMIN (own tenant, e.g. when
// booking an appointment on a client's behalf). Issues a short-lived signed
// Storage upload URL scoped to cases/{tenantSlug}/{caseId}/documents/... —
// never a raw bucket credential (docs/api-patterns.md §1.7).
exports.caseDocumentsRouter.post("/upload-url", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN"), async (req, res) => {
    const body = uploadUrlSchema.parse(req.body);
    const caseRow = await (0, rls_context_1.withTenantContext)(req.tenantContext, (tx) => loadCaseForDocuments(tx, req));
    const upload = await (0, storage_1.createCaseDocumentUploadUrl)(req.tenant.slug, caseRow.id, body.fileName);
    res.status(201).json({ data: upload });
});
const createDocumentSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().min(1).max(255),
    storagePath: zod_1.z.string().min(1),
    isClientVisible: zod_1.z.boolean().default(false),
    // Direct appointment scoping, if this document was uploaded against a
    // specific appointment rather than the case in general.
    appointmentId: zod_1.z.string().uuid().optional(),
    // Set when this upload fulfills a Task of type UPLOAD_DOCUMENT — the
    // task auto-completes once the document row is created.
    taskId: zod_1.z.string().uuid().optional(),
})
    .strict();
// POST /tenants/:tenantId/cases/:caseId/documents — CONSULTANT (own case),
// self (CLIENT, own case), TENANT_ADMIN (own tenant). Step 2 of upload —
// creates the metadata row once the client-side PUT to Storage (via the
// upload-url above) has completed.
exports.caseDocumentsRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN"), async (req, res) => {
    const body = createDocumentSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForDocuments(tx, req);
        if (body.appointmentId) {
            const appointment = await tx.appointment.findUnique({
                where: { id: body.appointmentId },
            });
            if (!appointment || appointment.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
            }
        }
        let task = null;
        if (body.taskId) {
            task = await tx.task.findUnique({ where: { id: body.taskId } });
            if (!task || task.caseId !== caseRow.id || task.type !== "UPLOAD_DOCUMENT") {
                throw new errorHandler_1.AppError(404, "Task not found", "TASK_NOT_FOUND");
            }
            if (task.status === "COMPLETED") {
                throw new errorHandler_1.AppError(409, "This task is already completed", "TASK_ALREADY_COMPLETED");
            }
        }
        const document = await tx.document.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                fileName: body.fileName,
                storagePath: body.storagePath,
                isClientVisible: body.isClientVisible,
                appointmentId: body.appointmentId,
                taskId: body.taskId,
                uploadedByRole: req.user.role,
            },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "DOCUMENT_UPLOADED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
            document: {
                id: document.id,
                fileName: document.fileName,
                isClientVisible: document.isClientVisible,
            },
        });
        if (task) {
            const completedTask = await tx.task.update({
                where: { id: task.id },
                data: { status: "COMPLETED", completedAt: new Date() },
            });
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "TASK_COMPLETED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
                task: {
                    id: completedTask.id,
                    title: completedTask.title,
                    assignedTo: completedTask.assignedTo,
                },
            });
        }
        return document;
    });
    res.status(201).json({ data: created });
});
// GET /tenants/:tenantId/cases/:caseId/documents/:documentId/download-url —
// CONSULTANT (own case), self (CLIENT, if visible), TENANT_ADMIN (own tenant),
// SUPER_ADMIN (any case, audit-logged via loadCaseForDocuments). Short-lived
// signed URL, never a permanent public link.
exports.caseDocumentsRouter.get("/:documentId/download-url", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"), async (req, res) => {
    const url = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForDocuments(tx, req);
        const doc = await findDocument(tx, req.params.tenantId, caseRow.id, req.params.documentId);
        if (req.user.role === "CLIENT" && !doc.isClientVisible) {
            throw new errorHandler_1.AppError(403, "Forbidden", "DOCUMENT_NOT_VISIBLE");
        }
        return (0, storage_1.createCaseDocumentDownloadUrl)(doc.storagePath);
    });
    res.json({ data: { url } });
});
// DELETE /tenants/:tenantId/cases/:caseId/documents/:documentId —
// CONSULTANT (own case, any document), self (CLIENT, own case, only
// documents they themselves uploaded — consultant-uploaded case files stay
// under consultant control). Soft-delete, 30-day recovery per schema §5.
exports.caseDocumentsRouter.delete("/:documentId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForDocuments(tx, req);
        const doc = await findDocument(tx, req.params.tenantId, caseRow.id, req.params.documentId);
        if (req.user.role === "CLIENT" && doc.uploadedByRole !== "CLIENT") {
            throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_UPLOAD");
        }
        await tx.document.update({
            where: { id: req.params.documentId },
            data: { deletedAt: new Date() },
        });
    });
    res.status(204).send();
});
//# sourceMappingURL=case-documents.router.js.map