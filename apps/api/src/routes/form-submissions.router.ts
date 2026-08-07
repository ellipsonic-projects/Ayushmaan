import { Router, Request, Response } from "express";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { getOwnClientProfileId } from "../lib/callerProfile";
import type { TemplateHeaderInfo } from "../lib/template-header";
import { buildCaseContext } from "../lib/workflow-context";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { enqueue, WORKFLOW_ADVANCE_QUEUE } from "../queue/pgmq";

// Same validator (ajv8) rjsf uses client-side in the public fill page, run
// again here so a submission can never bypass a form's schema by hitting
// this endpoint directly instead of the rendered form.
const ajv = addFormats(new Ajv({ allErrors: true, strict: false }));

// Same system-lookup pattern tenant-context.ts/getTenant.ts use — must be a
// valid uuid, since RLS policies elsewhere (e.g.
// current_client_profile_id() in 06-client-platform-self-read.sql) cast
// app.user_id to uuid unconditionally, even when app.is_super_admin is true
// (Postgres doesn't guarantee short-circuit evaluation of OR'd policies).
const SYSTEM_LOOKUP_USER_ID = "00000000-0000-0000-0000-000000000000";

// Mounted at /api/tenants/:tenantId/cases/:caseId/form-submissions. Creation
// only ever happens server-side, from the SEND_INTAKE_FORM workflow node
// (form-submission.service.ts's createAndSendFormSubmission) — this router
// only lists submissions for a case, surfaced in the client/consultant
// documentation views alongside uploaded documents.
export const caseFormSubmissionsRouter: Router = Router({ mergeParams: true });
caseFormSubmissionsRouter.use(requireTenantMatch);

async function loadCaseForFormSubmissions(tx: Prisma.TransactionClient, req: TenantScopedRequest) {
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

// GET /tenants/:tenantId/cases/:caseId/form-submissions
caseFormSubmissionsRouter.get("/", async (req: TenantScopedRequest, res: Response) => {
  const submissions = await withTenantContext(req.tenantContext!, async (tx) => {
    const caseRow = await loadCaseForFormSubmissions(tx, req);
    return tx.formSubmission.findMany({
      where: { caseId: caseRow.id },
      include: { formTemplate: { select: { name: true, jsonSchema: true, uiSchema: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  // accessToken is only ever needed by the public fill link generated at
  // send time — never returned in an authenticated listing.
  res.json({
    data: submissions.map(({ accessToken: _accessToken, ...rest }) => rest),
  });
});

// Public, unauthenticated router mounted at /api/forms (ahead of
// authMiddleware in index.ts) — the accessToken itself is the security
// boundary, same precedent as consultant-invite-codes.router.ts's code
// redemption, so this intentionally looks the row up outside RLS via
// isSuperAdmin:true the same way auth-register.router.ts does for
// pre-account state (packages/db/src/rls-context.ts).
export const publicFormSubmissionsRouter: Router = Router();

async function findByToken(token: string) {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID },
    (tx) =>
      tx.formSubmission.findUnique({
        where: { accessToken: token },
        include: {
          formTemplate: {
            select: {
              name: true,
              jsonSchema: true,
              uiSchema: true,
              consultant: { select: { fullName: true } },
            },
          },
        },
      })
  );
}

// Header shown above the public form — same organization/consultant contact
// block template-header.ts prepends to sent message templates.
async function buildPublicFormHeader(
  tenantId: string,
  consultantName: string
): Promise<TemplateHeaderInfo> {
  const [tenant, admin] = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID },
    (tx) =>
      Promise.all([
        tx.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          select: { displayName: true, phone: true, address: true },
        }),
        tx.user.findFirst({
          where: { tenantId, role: "TENANT_ADMIN" },
          select: { email: true, phone: true },
        }),
      ])
  );
  return {
    organizationName: tenant.displayName,
    consultantName,
    contactNumber: tenant.phone ?? "",
    tenantAddress: tenant.address ?? "",
    adminEmail: admin?.email ?? "",
    adminPhone: admin?.phone ?? "",
  };
}

// GET /api/forms/:token
publicFormSubmissionsRouter.get("/:token", async (req: Request, res: Response) => {
  const submission = await findByToken(req.params.token);
  if (!submission) {
    throw new AppError(404, "Form not found", "FORM_SUBMISSION_NOT_FOUND");
  }
  if (submission.status === "PENDING" && submission.expiresAt.getTime() < Date.now()) {
    await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID },
      (tx) =>
        tx.formSubmission.update({ where: { id: submission.id }, data: { status: "EXPIRED" } })
    );
    throw new AppError(410, "This form link has expired", "FORM_SUBMISSION_EXPIRED");
  }

  const header = await buildPublicFormHeader(
    submission.tenantId,
    submission.formTemplate.consultant.fullName
  );

  res.json({
    data: {
      status: submission.status,
      formName: submission.formTemplate.name,
      header,
      jsonSchema: submission.formTemplate.jsonSchema,
      uiSchema: submission.formTemplate.uiSchema,
      answers: submission.answers,
    },
  });
});

// POST /api/forms/:token/submit
publicFormSubmissionsRouter.post("/:token/submit", async (req: Request, res: Response) => {
  const submission = await findByToken(req.params.token);
  if (!submission) {
    throw new AppError(404, "Form not found", "FORM_SUBMISSION_NOT_FOUND");
  }
  if (submission.status === "SUBMITTED") {
    throw new AppError(409, "This form has already been submitted", "FORM_ALREADY_SUBMITTED");
  }
  if (submission.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, "This form link has expired", "FORM_SUBMISSION_EXPIRED");
  }

  const validate = ajv.compile(submission.formTemplate.jsonSchema as object);
  const answers = req.body as Record<string, unknown>;
  if (!validate(answers)) {
    throw new AppError(422, "Some answers don't match the form's requirements", "INVALID_ANSWERS");
  }

  const updated = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID },
    async (tx) => {
      const row = await tx.formSubmission.update({
        where: { id: submission.id },
        data: {
          answers: answers as Prisma.InputJsonValue,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      const caseContext = await buildCaseContext(tx, submission.caseId);
      const formContext = {
        ...caseContext,
        form: {
          formTemplateId: submission.formTemplateId,
          submissionId: row.id,
          answers: row.answers,
        },
      };

      // Fire any FORM_SUBMITTED-triggered workflows whose TRIGGER node is
      // pinned to this specific form template (matchFormTemplateId guard in
      // workflow-events.ts keeps other forms' workflows from firing too) —
      // these are fresh runs, independent of the resume below.
      await enqueueEventTriggers(
        tx,
        submission.tenantId,
        "FORM_SUBMITTED",
        formContext,
        submission.formTemplateId // matchFormTemplateId
      );

      // Complete the FILL_FORM task this submission was sent for, if any —
      // same completion path case-documents.router.ts uses for UPLOAD_DOCUMENT.
      if (submission.taskId) {
        const task = await tx.task.findUnique({ where: { id: submission.taskId } });
        if (task && task.status !== "COMPLETED") {
          const completedTask = await tx.task.update({
            where: { id: task.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          await enqueueEventTriggers(tx, submission.tenantId, "TASK_COMPLETED", {
            ...caseContext,
            task: {
              id: completedTask.id,
              title: completedTask.title,
              assignedTo: completedTask.assignedTo,
            },
          });
        }
      }

      // Resume the specific run this form was sent from (workflow-node-handlers.ts's
      // SEND_INTAKE_FORM parked it WAITING_ON_FORM with currentNodeId already
      // advanced past that node) — merge the answers into its context first so a
      // downstream CONDITION/BRANCH node can branch on `form.*` immediately.
      if (submission.workflowRunId) {
        const run = await tx.workflowRun.findUnique({ where: { id: submission.workflowRunId } });
        if (run && run.status === "WAITING_ON_FORM" && !run.deletedAt) {
          await tx.workflowRun.update({
            where: { id: run.id },
            data: {
              status: "RUNNING",
              context: { ...(run.context as Record<string, unknown>), ...formContext },
            },
          });
          await enqueue(WORKFLOW_ADVANCE_QUEUE, { runId: run.id });
        }
      }

      return row;
    }
  );

  res.json({ data: { status: updated.status } });
});
