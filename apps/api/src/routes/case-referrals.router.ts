import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { dispatch } from "../services/notification.service";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { buildCaseContext } from "../lib/workflow-context";

// Mounted at /api/tenants/:tenantId/cases/:caseId/refer. Sprint 4.5 wired
// this entry point; the accept/decline inbox/outbox is
// consultant-referrals.router.ts (Phase 6, Sprint 6.1).
export const caseReferralsRouter: Router = Router({ mergeParams: true });
caseReferralsRouter.use(requireTenantMatch);

const referSchema = z
  .object({
    toConsultantId: z.string().uuid(),
    contextNote: z.string().max(1000).optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/refer — CONSULTANT (own case).
caseReferralsRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = referSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadOwnConsultantCase(
        tx,
        req.params.tenantId,
        req.params.caseId,
        req.user!.id
      );

      if (body.toConsultantId === caseRow.consultantId) {
        throw new AppError(422, "Cannot refer a case to its own consultant", "SELF_REFERRAL");
      }

      const toConsultant = await tx.consultantProfile.findUnique({
        where: { id: body.toConsultantId },
      });
      if (!toConsultant || toConsultant.tenantId !== req.params.tenantId) {
        throw new AppError(404, "Consultant not found", "CONSULTANT_NOT_FOUND");
      }

      const referral = await tx.consultantReferral.create({
        data: {
          tenantId: req.params.tenantId,
          fromConsultantId: caseRow.consultantId!,
          toConsultantId: body.toConsultantId,
          clientId: caseRow.clientId,
          sourceCaseId: caseRow.id,
          contextNote: body.contextNote,
        },
      });

      await dispatch(tx, {
        tenantId: req.params.tenantId,
        userId: toConsultant.userId,
        type: "CASE_REFERRAL_RECEIVED",
        message: {
          subject: "New case referral",
          body: "A colleague referred a case to you. Open your referrals to review it.",
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "REFERRAL_CREATED", {
        ...(await buildCaseContext(tx, caseRow.id)),
        referral: { id: referral.id, toConsultantId: referral.toConsultantId },
      });

      return referral;
    });

    res.status(201).json({ data: created });
  }
);
