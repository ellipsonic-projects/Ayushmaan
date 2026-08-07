import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { dispatchConsultantOnboarded } from "../services/notification.service";
import { applyTenantAvailabilityDefaults } from "../services/availability.service";
import { enqueueEventTriggers } from "../lib/workflow-events";

const CATEGORIES = ["MEDICAL", "LEGAL", "IT", "PHYSIOTHERAPY", "HOMEOPATHY", "ASTROLOGY"] as const;

const createApplicationSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{10}$/, "Code must be 10 alphanumeric characters"),
    category: z.enum(CATEGORIES),
    subSpecialization: z.string().max(150).optional(),
    bio: z.string().optional(),
    consultationFee: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    languagesSpoken: z.array(z.string()).optional(),
    message: z.string().optional(),
  })
  .strict();

// Self-serve "become a consultant" flow, mounted at /api/clients (platform-
// level, mirrors platformClientsRouter's GET /tenants directory search) —
// a CLIENT account has no tenantId, so these routes resolve tenant scope
// from the body/params rather than from tenant-context middleware.
export const platformConsultantApplicationsRouter: Router = Router();

// POST /clients/consultant-applications — CLIENT redeems a 10-character invite
// code a TENANT_ADMIN generated and sent them out-of-band
// (consultant-invite-codes.router.ts) to apply to become a CONSULTANT under
// that tenant. The code both identifies the tenant and proves the admin
// actually invited this person, replacing the old "search any org and
// apply" self-serve flow.
platformConsultantApplicationsRouter.post(
  "/",
  requireRole("CLIENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    const body = createApplicationSchema.parse(req.body);

    const application = await withTenantContext(
      { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
      async (tx) => {
        const inviteCode = await tx.consultantInviteCode.findUnique({ where: { code: body.code } });
        if (!inviteCode || inviteCode.status !== "ACTIVE" || inviteCode.expiresAt < new Date()) {
          throw new AppError(404, "Invite code not found or expired", "INVITE_CODE_NOT_FOUND");
        }

        const tenant = await tx.tenant.findUnique({ where: { id: inviteCode.tenantId } });
        if (!tenant || tenant.status !== "ACTIVE") {
          throw new AppError(404, "Organization not found", "TENANT_NOT_FOUND");
        }

        const existingPending = await tx.consultantApplication.findFirst({
          where: { userId: req.user!.id, tenantId: inviteCode.tenantId, status: "PENDING" },
        });
        if (existingPending) {
          throw new AppError(
            409,
            "You already have a pending application to this organization",
            "APPLICATION_ALREADY_PENDING"
          );
        }

        await tx.consultantInviteCode.update({
          where: { id: inviteCode.id },
          data: { status: "USED", usedBy: req.user!.id, usedAt: new Date() },
        });

        const created = await tx.consultantApplication.create({
          data: {
            tenantId: inviteCode.tenantId,
            userId: req.user!.id,
            inviteCodeId: inviteCode.id,
            category: body.category,
            subSpecialization: body.subSpecialization,
            bio: body.bio,
            ...(body.consultationFee !== undefined && { consultationFee: body.consultationFee }),
            ...(body.currency && { currency: body.currency }),
            ...(body.languagesSpoken && { languagesSpoken: body.languagesSpoken }),
            message: body.message,
          },
        });

        await enqueueEventTriggers(tx, inviteCode.tenantId, "CONSULTANT_APPLICATION_SUBMITTED", {
          application: { id: created.id, category: created.category },
        });

        return created;
      }
    );

    res.status(201).json({ data: application });
  }
);

// GET /clients/consultant-applications/me — the CLIENT's own application
// history, across every tenant they've applied to.
platformConsultantApplicationsRouter.get(
  "/me",
  requireRole("CLIENT"),
  async (req: AuthenticatedRequest, res: Response) => {
    const applications = await withTenantContext(
      { tenantId: null, isSuperAdmin: false, userId: req.user!.id },
      (tx) =>
        tx.consultantApplication.findMany({
          where: { userId: req.user!.id },
          include: { tenant: { select: { displayName: true, slug: true, logoUrl: true } } },
          orderBy: { createdAt: "desc" },
        })
    );
    res.json({ data: applications });
  }
);

// Tenant-admin review queue, mounted at /api/tenants/:tenantId/consultant-applications.
export const consultantApplicationsRouter: Router = Router({ mergeParams: true });
consultantApplicationsRouter.use(requireTenantMatch);

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

// GET /tenants/:tenantId/consultant-applications
consultantApplicationsRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listQuerySchema.parse(req.query);

    const applications = await withTenantContext(req.tenantContext!, (tx) =>
      tx.consultantApplication.findMany({
        where: { tenantId: req.params.tenantId, ...(query.status && { status: query.status }) },
        include: { user: { select: { email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
    res.json({ data: applications });
  }
);

async function findPendingApplication(
  tx: Prisma.TransactionClient,
  tenantId: string,
  applicationId: string
) {
  const application = await tx.consultantApplication.findUnique({ where: { id: applicationId } });
  if (!application || application.tenantId !== tenantId) {
    throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
  }
  if (application.status !== "PENDING") {
    throw new AppError(
      409,
      "Application has already been reviewed",
      "APPLICATION_ALREADY_REVIEWED"
    );
  }
  return application;
}

// POST /tenants/:tenantId/consultant-applications/:id/approve — converts the
// applicant's User in place (role -> CONSULTANT, tenantId set) and creates
// their ConsultantProfile from the fields captured on the application, the
// same mechanics as consultants.router.ts's admin-invite POST /consultants.
consultantApplicationsRouter.post(
  "/:id/approve",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const profile = await withTenantContext(req.tenantContext!, async (tx) => {
      const application = await findPendingApplication(tx, req.params.tenantId, req.params.id);

      const applicant = await tx.clientProfile.findUnique({
        where: { userId: application.userId },
      });
      if (!applicant) {
        throw new AppError(404, "Applicant profile not found", "CLIENT_PROFILE_NOT_FOUND");
      }

      const updatedUser = await tx.user.update({
        where: { id: application.userId },
        data: {
          role: "CONSULTANT",
          tenantId: req.params.tenantId,
          consultantProfile: {
            create: {
              tenantId: req.params.tenantId,
              fullName: applicant.fullName,
              category: application.category,
              subSpecialization: application.subSpecialization,
              bio: application.bio,
              consultationFee: application.consultationFee,
              currency: application.currency,
              languagesSpoken: application.languagesSpoken,
              invitedBy: req.user!.id,
            },
          },
        },
        include: { consultantProfile: true },
      });

      if (updatedUser.consultantProfile) {
        await applyTenantAvailabilityDefaults(
          tx,
          req.params.tenantId,
          updatedUser.consultantProfile.id
        );
      }

      await tx.consultantApplication.update({
        where: { id: application.id },
        data: { status: "APPROVED", reviewedBy: req.user!.id, reviewedAt: new Date() },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "CONSULTANT_APPLICATION_APPROVED", {
        application: { id: application.id },
      });
      if (updatedUser.consultantProfile) {
        await enqueueEventTriggers(tx, req.params.tenantId, "CONSULTANT_ONBOARDED", {
          consultant: {
            id: updatedUser.consultantProfile.id,
            fullName: updatedUser.consultantProfile.fullName,
            category: updatedUser.consultantProfile.category,
          },
        });
      }

      return updatedUser;
    });

    res.json({ data: profile });

    // Fire-and-forget: notification delivery (email) must not block the
    // approve response — dispatch() already catches per-channel send errors,
    // this just guards the outer transaction wrapper too.
    withTenantContext(req.tenantContext!, (tx) =>
      dispatchConsultantOnboarded(tx, {
        tenantId: req.params.tenantId,
        newConsultantName: profile.consultantProfile!.fullName,
        excludeUserId: profile.id,
      })
    ).catch((err) => {
      console.error("[consultant-applications] onboarded notification dispatch failed:", err);
    });
  }
);

const rejectSchema = z.object({ reason: z.string().max(500).optional() }).strict();

// POST /tenants/:tenantId/consultant-applications/:id/reject
consultantApplicationsRouter.post(
  "/:id/reject",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = rejectSchema.parse(req.body ?? {});

    const application = await withTenantContext(req.tenantContext!, async (tx) => {
      const found = await findPendingApplication(tx, req.params.tenantId, req.params.id);
      const result = await tx.consultantApplication.update({
        where: { id: found.id },
        data: {
          status: "REJECTED",
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          rejectionReason: body.reason,
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "CONSULTANT_APPLICATION_REJECTED", {
        application: { id: result.id, rejectionReason: body.reason },
      });

      return result;
    });

    res.json({ data: application });
  }
);
