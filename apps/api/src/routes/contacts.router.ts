import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";

// Shared tenant-wide contacts directory (referral partners, vendors, other
// non-client contacts). Mounted at /api/tenants/:tenantId/contacts.
export const contactsRouter: Router = Router({ mergeParams: true });
contactsRouter.use(requireTenantMatch);

const listContactsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
});

// GET /tenants/:tenantId/contacts
contactsRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listContactsQuerySchema.parse(req.query);

    const contacts = await withTenantContext(req.tenantContext!, (tx) =>
      tx.contact.findMany({
        where: {
          tenantId: req.params.tenantId,
          ...(query.type && { type: query.type }),
          ...(query.search && {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" as const } },
              { organization: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }),
        },
        orderBy: { fullName: "asc" },
      })
    );
    res.json({ data: contacts });
  }
);

const createContactSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    type: z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
    organization: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    notes: z.string().optional(),
  })
  .strict();

// POST /tenants/:tenantId/contacts
contactsRouter.post(
  "/",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createContactSchema.parse(req.body);

    const contact = await withTenantContext(req.tenantContext!, (tx) =>
      tx.contact.create({
        data: {
          tenantId: req.params.tenantId,
          createdBy: req.user!.id,
          ...body,
        },
      })
    );

    res.status(201).json({ data: contact });
  }
);

async function findContact(tx: Prisma.TransactionClient, tenantId: string, contactId: string) {
  const contact = await tx.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.tenantId !== tenantId) {
    throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
  }
  return contact;
}

// GET /tenants/:tenantId/contacts/:contactId
contactsRouter.get(
  "/:contactId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const contact = await withTenantContext(req.tenantContext!, (tx) =>
      findContact(tx, req.params.tenantId, req.params.contactId)
    );
    res.json({ data: contact });
  }
);

const patchContactSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    type: z.enum(["REFERRAL_PARTNER", "VENDOR", "OTHER"]).optional(),
    organization: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    notes: z.string().optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/contacts/:contactId
contactsRouter.patch(
  "/:contactId",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const updates = patchContactSchema.parse(req.body);

    const contact = await withTenantContext(req.tenantContext!, async (tx) => {
      await findContact(tx, req.params.tenantId, req.params.contactId);
      return tx.contact.update({ where: { id: req.params.contactId }, data: updates });
    });

    res.json({ data: contact });
  }
);

// DELETE /tenants/:tenantId/contacts/:contactId
contactsRouter.delete(
  "/:contactId",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      await findContact(tx, req.params.tenantId, req.params.contactId);
      await tx.contact.delete({ where: { id: req.params.contactId } });
    });
    res.status(204).send();
  }
);
