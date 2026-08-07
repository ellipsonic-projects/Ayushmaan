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
import { buildCaseContext } from "../lib/workflow-context";
import { renderTemplate } from "../services/template-render.service";
import {
  buildTemplateHeader,
  renderTemplateHeaderHtml,
  renderTemplateHeaderText,
} from "../lib/template-header";

// Mounted at /api/tenants/:tenantId/cases/:caseId/shared-templates. Creation
// is a manual CONSULTANT action (share a message/form template into a
// case's documentation); workflow-node-handlers.ts's sendViaTemplate creates
// the same kind of row automatically whenever a workflow sends a message
// template to a client. This router only lists + creates — no edit, since
// every row is an immutable point-in-time snapshot (see schema.prisma).
export const caseSharedTemplatesRouter: Router = Router({ mergeParams: true });
caseSharedTemplatesRouter.use(requireTenantMatch);

// Same shape as case-documents.router.ts's loadCaseForDocuments /
// form-submissions.router.ts's loadCaseForFormSubmissions.
async function loadCaseForSharedTemplates(tx: Prisma.TransactionClient, req: TenantScopedRequest) {
  if (req.user!.role === "CONSULTANT") {
    return loadOwnConsultantCase(tx, req.params.tenantId, req.params.caseId, req.user!.id);
  }
  const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
  if (!found || found.tenantId !== req.params.tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }
  if (req.user!.role === "TENANT_ADMIN") return found;
  if (req.user!.role === "SUPER_ADMIN") return found;
  const clientId = await getOwnClientProfileId(tx, req.user!.id);
  if (clientId !== found.clientId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
  }
  return found;
}

// GET /tenants/:tenantId/cases/:caseId/shared-templates
caseSharedTemplatesRouter.get(
  "/",
  requireRole("CONSULTANT", "CLIENT", "TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const shares = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadCaseForSharedTemplates(tx, req);
      return tx.sharedTemplate.findMany({
        where: { caseId: caseRow.id },
        orderBy: { createdAt: "desc" },
      });
    });

    res.json({ data: shares });
  }
);

const createSchema = z
  .union([
    z.object({ workflowTemplateId: z.string().uuid() }).strict(),
    z.object({ formTemplateId: z.string().uuid() }).strict(),
  ])
  .describe("Exactly one of workflowTemplateId or formTemplateId");

// POST /tenants/:tenantId/cases/:caseId/shared-templates — owning CONSULTANT
// only. Renders the template's current content against the case's merge
// fields and stores that as an immutable snapshot, same rendering path
// workflow sends use (template-render.service.ts).
caseSharedTemplatesRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadOwnConsultantCase(
        tx,
        req.params.tenantId,
        req.params.caseId,
        req.user!.id
      );
      const context = await buildCaseContext(tx, caseRow.id);
      const header = buildTemplateHeader(context);

      if ("workflowTemplateId" in body) {
        const template = await tx.workflowTemplate.findUnique({
          where: { id: body.workflowTemplateId },
        });
        if (!template || template.deletedAt) {
          throw new AppError(404, "Template not found", "WORKFLOW_TEMPLATE_NOT_FOUND");
        }
        return tx.sharedTemplate.create({
          data: {
            tenantId: req.params.tenantId,
            caseId: caseRow.id,
            workflowTemplateId: template.id,
            templateName: template.name,
            channel: template.channel,
            renderedContent: {
              subject: template.subject,
              html:
                renderTemplateHeaderHtml(header) +
                renderTemplate(template.content, context, "EMAIL"),
              text:
                renderTemplateHeaderText(header) +
                renderTemplate(template.content, context, template.channel),
            },
          },
        });
      }

      const template = await tx.formTemplate.findUnique({ where: { id: body.formTemplateId } });
      if (!template || template.deletedAt) {
        throw new AppError(404, "Template not found", "FORM_TEMPLATE_NOT_FOUND");
      }
      return tx.sharedTemplate.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          formTemplateId: template.id,
          templateName: template.name,
          renderedContent: {
            header: header as unknown as Prisma.InputJsonValue,
            jsonSchema: template.jsonSchema as Prisma.InputJsonValue,
            uiSchema: template.uiSchema as Prisma.InputJsonValue,
          },
        },
      });
    });

    res.status(201).json({ data: created });
  }
);
