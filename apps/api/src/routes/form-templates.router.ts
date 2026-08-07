import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { getOwnConsultantProfileId } from "../lib/callerProfile";

// Mounted at /api/tenants/:tenantId/form-templates. Same scope-gated
// visibility model as workflow-templates.router.ts (form_templates_scope_policy
// in supabase/policies/12-form-templates.sql is the real enforcement) — this
// router doesn't build a COMMUNITY-moderation surface the way
// workflow-templates.router.ts does, since that wasn't asked for here; a
// COMMUNITY-scoped form template simply stays PENDING (invisible to other
// tenants) until that's added.
export const formTemplatesRouter: Router = Router({ mergeParams: true });
formTemplatesRouter.use(requireTenantMatch);
formTemplatesRouter.use(requireRole("CONSULTANT", "TENANT_ADMIN", "SUPER_ADMIN"));

// A JSON Schema (Draft-07) object built by the builder's field palette
// (apps/web/lib/forms/builder-schema.ts) — validated loosely here (must be an
// object schema with a properties map); the builder is the only writer, so
// deep structural validation isn't duplicated server-side.
const jsonSchemaSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(z.unknown()).default({}),
  })
  .passthrough();
const uiSchemaSchema = z.record(z.unknown());

async function findTemplate(tx: Prisma.TransactionClient, templateId: string) {
  const template = await tx.formTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.deletedAt) {
    throw new AppError(404, "Form template not found", "FORM_TEMPLATE_NOT_FOUND");
  }
  return template;
}

async function requireOwnTemplate(
  tx: Prisma.TransactionClient,
  userId: string,
  template: { consultantId: string }
) {
  const consultantId = await getOwnConsultantProfileId(tx, userId);
  if (!consultantId || consultantId !== template.consultantId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_TEMPLATE");
  }
}

function withOwnership<T extends { consultantId: string }>(
  template: T,
  callerConsultantId: string | null
) {
  return { ...template, isOwn: template.consultantId === callerConsultantId };
}

const listQuerySchema = z.object({
  scope: z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
});

// GET /tenants/:tenantId/form-templates
formTemplatesRouter.get("/", async (req: TenantScopedRequest, res: Response) => {
  const query = listQuerySchema.parse(req.query);

  const templates = await withTenantContext(req.tenantContext!, (tx) =>
    tx.formTemplate.findMany({
      where: { deletedAt: null, ...(query.scope && { scope: query.scope }) },
      include: { consultant: { select: { fullName: true } } },
      orderBy: { updatedAt: "desc" },
    })
  );
  const callerConsultantId = req.tenantContext!.consultantId ?? null;
  res.json({ data: templates.map((t) => withOwnership(t, callerConsultantId)) });
});

// GET /tenants/:tenantId/form-templates/:templateId
formTemplatesRouter.get("/:templateId", async (req: TenantScopedRequest, res: Response) => {
  const template = await withTenantContext(req.tenantContext!, (tx) =>
    findTemplate(tx, req.params.templateId)
  );
  res.json({ data: withOwnership(template, req.tenantContext!.consultantId ?? null) });
});

const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(200),
    scope: z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).default("PERSONAL"),
    jsonSchema: jsonSchemaSchema,
    uiSchema: uiSchemaSchema.default({}),
  })
  .strict();

// POST /tenants/:tenantId/form-templates — CONSULTANT only;
// form_templates_write_policy ties every insert to the caller's own
// tenant_id + consultant_id regardless of scope.
formTemplatesRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createTemplateSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const consultantId = await getOwnConsultantProfileId(tx, req.user!.id);
      if (!consultantId) {
        throw new AppError(403, "Forbidden", "NOT_A_CONSULTANT");
      }
      return tx.formTemplate.create({
        data: {
          tenantId: req.params.tenantId,
          consultantId,
          name: body.name,
          scope: body.scope,
          jsonSchema: body.jsonSchema as Prisma.InputJsonValue,
          uiSchema: body.uiSchema as Prisma.InputJsonValue,
        },
      });
    });

    res.status(201).json({ data: created });
  }
);

const patchTemplateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    scope: z.enum(["PERSONAL", "TENANT", "COMMUNITY"]).optional(),
    jsonSchema: jsonSchemaSchema.optional(),
    uiSchema: uiSchemaSchema.optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/form-templates/:templateId — owning CONSULTANT only.
formTemplatesRouter.patch(
  "/:templateId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchTemplateSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const template = await findTemplate(tx, req.params.templateId);
      await requireOwnTemplate(tx, req.user!.id, template);
      const effectiveScope = body.scope ?? template.scope;
      const resubmittingToCommunity =
        effectiveScope === "COMMUNITY" && template.scope !== "COMMUNITY";
      return tx.formTemplate.update({
        where: { id: req.params.templateId },
        data: {
          ...body,
          jsonSchema: body.jsonSchema as Prisma.InputJsonValue | undefined,
          uiSchema: body.uiSchema as Prisma.InputJsonValue | undefined,
          ...(resubmittingToCommunity && { status: "PENDING" }),
        },
      });
    });

    res.json({ data: updated });
  }
);

// DELETE /tenants/:tenantId/form-templates/:templateId — owning CONSULTANT
// only. Soft-deletes via deletedAt.
formTemplatesRouter.delete(
  "/:templateId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const template = await findTemplate(tx, req.params.templateId);
      await requireOwnTemplate(tx, req.user!.id, template);
      await tx.formTemplate.update({
        where: { id: req.params.templateId },
        data: { deletedAt: new Date() },
      });
    });
    res.status(204).send();
  }
);
