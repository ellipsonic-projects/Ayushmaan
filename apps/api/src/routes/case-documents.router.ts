import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { getOwnClientProfileId } from "../lib/callerProfile";
import { writeAuditLog } from "../services/audit.service";
import {
  createCaseDocumentDownloadUrl,
  createCaseDocumentUploadUrl,
} from "../integrations/storage";
import { buildCaseContext } from "../lib/workflow-context";
import { enqueueEventTriggers } from "../lib/workflow-events";

// Mounted at /api/tenants/:tenantId/cases/:caseId/documents.
export const caseDocumentsRouter: Router = Router({ mergeParams: true });
caseDocumentsRouter.use(requireTenantMatch);

// CONSULTANT must own the case; CLIENT must be the case's own client;
// TENANT_ADMIN may act on any case in their own tenant (e.g. attaching a
// document while booking an appointment on a client's behalf); SUPER_ADMIN
// may read any case's documents, cross-tenant, audit-logged (same rationale
// as cases.router.ts's GET /:caseId).
async function loadCaseForDocuments(tx: Prisma.TransactionClient, req: TenantScopedRequest) {
  if (req.user!.role === "CONSULTANT") {
    return loadOwnConsultantCase(tx, req.params.tenantId, req.params.caseId, req.user!.id);
  }
  const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
  if (!found || found.tenantId !== req.params.tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }
  if (req.user!.role === "TENANT_ADMIN") {
    return found;
  }
  if (req.user!.role === "SUPER_ADMIN") {
    await writeAuditLog(tx, {
      tenantId: req.params.tenantId,
      actorUserId: req.user!.id,
      actorRole: "SUPER_ADMIN",
      isCrossTenantAccess: true,
      action: "READ",
      entityType: "Case",
      entityId: found.id,
    });
    return found;
  }
  const clientId = await getOwnClientProfileId(tx, req.user!.id);
  if (clientId !== found.clientId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
  }
  return found;
}

async function findDocument(
  tx: Prisma.TransactionClient,
  tenantId: string,
  caseId: string,
  documentId: string
) {
  const doc = await tx.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.tenantId !== tenantId || doc.caseId !== caseId || doc.deletedAt) {
    throw new AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
  }
  return doc;
}

// GET /tenants/:tenantId/cases/:caseId/documents — CONSULTANT (own case, all
// non-deleted docs), CLIENT (own case, isClientVisible only), TENANT_ADMIN
// (own tenant, e.g. reviewing what a client attached while booking), SUPER_ADMIN
// (any tenant, audit-logged via loadCaseForDocuments).
caseDocumentsRouter.get(
  "/",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const docs = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForDocuments(tx, req);
      return tx.document.findMany({
        where: {
          caseId: caseRow.id,
          deletedAt: null,
          ...(req.user!.role === "CLIENT" && { isClientVisible: true }),
        },
        orderBy: { createdAt: "desc" },
      });
    });

    res.json({ data: docs });
  }
);

const uploadUrlSchema = z
  .object({
    fileName: z.string().min(1).max(255),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/documents/upload-url — CONSULTANT
// (own case), self (CLIENT, own case), TENANT_ADMIN (own tenant, e.g. when
// booking an appointment on a client's behalf). Issues a short-lived signed
// Storage upload URL scoped to cases/{tenantSlug}/{caseId}/documents/... —
// never a raw bucket credential (docs/api-patterns.md §1.7).
caseDocumentsRouter.post(
  "/upload-url",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = uploadUrlSchema.parse(req.body);

    const caseRow = await withTenantContext(req.tenantContext!, (tx) =>
      loadCaseForDocuments(tx, req)
    );

    const upload = await createCaseDocumentUploadUrl(req.tenant!.slug, caseRow.id, body.fileName);
    res.status(201).json({ data: upload });
  }
);

const createDocumentSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    storagePath: z.string().min(1),
    isClientVisible: z.boolean().default(false),
    // Direct appointment scoping, if this document was uploaded against a
    // specific appointment rather than the case in general.
    appointmentId: z.string().uuid().optional(),
    // Set when this upload fulfills a Task of type UPLOAD_DOCUMENT — the
    // task auto-completes once the document row is created.
    taskId: z.string().uuid().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/documents — CONSULTANT (own case),
// self (CLIENT, own case), TENANT_ADMIN (own tenant). Step 2 of upload —
// creates the metadata row once the client-side PUT to Storage (via the
// upload-url above) has completed.
caseDocumentsRouter.post(
  "/",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createDocumentSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForDocuments(tx, req);

      if (body.appointmentId) {
        const appointment = await tx.appointment.findUnique({
          where: { id: body.appointmentId },
        });
        if (!appointment || appointment.caseId !== caseRow.id) {
          throw new AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
        }
      }

      let task = null;
      if (body.taskId) {
        task = await tx.task.findUnique({ where: { id: body.taskId } });
        if (!task || task.caseId !== caseRow.id || task.type !== "UPLOAD_DOCUMENT") {
          throw new AppError(404, "Task not found", "TASK_NOT_FOUND");
        }
        if (task.status === "COMPLETED") {
          throw new AppError(409, "This task is already completed", "TASK_ALREADY_COMPLETED");
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
          uploadedByRole: req.user!.role as "CONSULTANT" | "CLIENT" | "TENANT_ADMIN",
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "DOCUMENT_UPLOADED", {
        ...(await buildCaseContext(tx, caseRow.id)),
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
        await enqueueEventTriggers(tx, req.params.tenantId, "TASK_COMPLETED", {
          ...(await buildCaseContext(tx, caseRow.id)),
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
  }
);

// GET /tenants/:tenantId/cases/:caseId/documents/:documentId/download-url —
// CONSULTANT (own case), self (CLIENT, if visible), TENANT_ADMIN (own tenant),
// SUPER_ADMIN (any case, audit-logged via loadCaseForDocuments). Short-lived
// signed URL, never a permanent public link.
caseDocumentsRouter.get(
  "/:documentId/download-url",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const url = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForDocuments(tx, req);
      const doc = await findDocument(tx, req.params.tenantId, caseRow.id, req.params.documentId);
      if (req.user!.role === "CLIENT" && !doc.isClientVisible) {
        throw new AppError(403, "Forbidden", "DOCUMENT_NOT_VISIBLE");
      }
      return createCaseDocumentDownloadUrl(doc.storagePath);
    });

    res.json({ data: { url } });
  }
);

// DELETE /tenants/:tenantId/cases/:caseId/documents/:documentId —
// CONSULTANT (own case, any document), self (CLIENT, own case, only
// documents they themselves uploaded — consultant-uploaded case files stay
// under consultant control). Soft-delete, 30-day recovery per schema §5.
caseDocumentsRouter.delete(
  "/:documentId",
  requireRole("CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForDocuments(tx, req);
      const doc = await findDocument(tx, req.params.tenantId, caseRow.id, req.params.documentId);
      if (req.user!.role === "CLIENT" && doc.uploadedByRole !== "CLIENT") {
        throw new AppError(403, "Forbidden", "NOT_OWN_UPLOAD");
      }
      await tx.document.update({
        where: { id: req.params.documentId },
        data: { deletedAt: new Date() },
      });
    });
    res.status(204).send();
  }
);
