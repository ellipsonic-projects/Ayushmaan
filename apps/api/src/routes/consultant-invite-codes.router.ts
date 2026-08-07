import { Router, Response } from "express";
import { randomInt } from "crypto";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";

const CODE_TTL_HOURS = 24;
const MAX_GENERATION_ATTEMPTS = 10;

const CODE_LENGTH = 10;
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

// Tenant-admin invite-code management, mounted at
// /api/tenants/:tenantId/consultant-invite-codes. A TENANT_ADMIN generates a
// code here and sends it to a prospective consultant out-of-band (phone
// call, WhatsApp, etc.); the applicant then redeems it in
// consultant-applications.router.ts's POST /clients/consultant-applications.
export const consultantInviteCodesRouter: Router = Router({ mergeParams: true });
consultantInviteCodesRouter.use(requireTenantMatch);

// POST /tenants/:tenantId/consultant-invite-codes
consultantInviteCodesRouter.post(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const inviteCode = await withTenantContext(req.tenantContext!, async (tx) => {
      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const code = generateCode();
        const existing = await tx.consultantInviteCode.findUnique({ where: { code } });
        if (existing) continue;

        return tx.consultantInviteCode.create({
          data: {
            tenantId: req.params.tenantId,
            code,
            createdBy: req.user!.id,
            expiresAt: new Date(Date.now() + CODE_TTL_HOURS * 60 * 60 * 1000),
          },
        });
      }
      throw new AppError(
        500,
        "Could not generate a unique code, please retry",
        "CODE_GENERATION_FAILED"
      );
    });

    res.status(201).json({ data: inviteCode });
  }
);

const listQuerySchema = z.object({
  status: z.enum(["ACTIVE", "USED", "REVOKED"]).optional(),
});

// GET /tenants/:tenantId/consultant-invite-codes
consultantInviteCodesRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listQuerySchema.parse(req.query);

    const inviteCodes = await withTenantContext(req.tenantContext!, (tx) =>
      tx.consultantInviteCode.findMany({
        where: { tenantId: req.params.tenantId, ...(query.status && { status: query.status }) },
        orderBy: { createdAt: "desc" },
      })
    );
    res.json({ data: inviteCodes });
  }
);

// POST /tenants/:tenantId/consultant-invite-codes/:id/revoke — deletes the
// row outright rather than marking status REVOKED: revoke only ever applies
// to an ACTIVE code, which by definition has no ConsultantApplication
// referencing it yet, so there's nothing a delete could orphan.
consultantInviteCodesRouter.post(
  "/:id/revoke",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await tx.consultantInviteCode.findUnique({ where: { id: req.params.id } });
      if (!found || found.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Invite code not found", "INVITE_CODE_NOT_FOUND");
      }
      if (found.status !== "ACTIVE") {
        throw new AppError(409, "Invite code is no longer active", "INVITE_CODE_NOT_ACTIVE");
      }
      await tx.consultantInviteCode.delete({ where: { id: found.id } });
    });

    res.status(204).end();
  }
);

// Platform-level lookup, mounted at /api/clients/consultant-invite-codes —
// a CLIENT account has no tenantId, same precedent as
// platformConsultantApplicationsRouter (consultant-applications.router.ts).
export const platformConsultantInviteCodesRouter: Router = Router();

const codeParamSchema = z.string().regex(/^[A-Z0-9]{10}$/);

// GET /clients/consultant-invite-codes/:code — lets the applicant confirm
// which organization a code belongs to before filling out the rest of the
// application form. Returns only the tenant's public directory fields.
platformConsultantInviteCodesRouter.get(
  "/:code",
  requireRole("CLIENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    const code = codeParamSchema.safeParse(req.params.code);
    if (!code.success) {
      throw new AppError(400, "Invalid code format", "INVALID_CODE_FORMAT");
    }

    const inviteCode = await withTenantContext(
      { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
      (tx) =>
        tx.consultantInviteCode.findUnique({
          where: { code: code.data },
          include: { tenant: { select: { displayName: true, slug: true, logoUrl: true } } },
        })
    );

    if (
      !inviteCode ||
      inviteCode.status !== "ACTIVE" ||
      inviteCode.expiresAt.getTime() < Date.now()
    ) {
      throw new AppError(404, "Invite code not found or expired", "INVITE_CODE_NOT_FOUND");
    }

    res.json({ data: { tenant: inviteCode.tenant } });
  }
);
