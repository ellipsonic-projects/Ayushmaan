import "dotenv/config";
// Must be imported before any router files: it patches Express's
// Router/Route prototype methods so a rejected promise from an `async`
// route handler is forwarded to errorHandler instead of becoming an
// unhandled rejection that crashes the whole process.
import "express-async-errors";
import express from "express";
import cors from "cors";
import { meRouter } from "./routes/me";
import { authRegisterRouter } from "./routes/auth-register.router";
import { platformTenantsRouter, tenantSettingsRouter } from "./routes/tenants.router";
import { platformDashboardRouter } from "./routes/platform-dashboard.router";
import { platformGrievancesRouter } from "./routes/platform-grievances.router";
import { platformNotifyRouter } from "./routes/platform-notify.router";
import { platformAuditLogRouter, tenantAuditLogRouter } from "./routes/audit-log.router";
import { usersRouter } from "./routes/users.router";
import { clientsRouter, guardianLinksRouter, platformClientsRouter } from "./routes/clients.router";
import {
  consultantsRouter,
  availabilitySlotsRouter,
  availabilityDefaultsRouter,
  outOfOfficeRouter,
  verificationDocumentsRouter,
} from "./routes/consultants.router";
import {
  platformConsultantApplicationsRouter,
  consultantApplicationsRouter,
} from "./routes/consultant-applications.router";
import {
  platformConsultantInviteCodesRouter,
  consultantInviteCodesRouter,
} from "./routes/consultant-invite-codes.router";
import { contactsRouter } from "./routes/contacts.router";
import { inboxRouter } from "./routes/inbox.router";
import { googleOAuthCallbackRouter } from "./routes/google-oauth-callback.router";
import { casesRouter } from "./routes/cases.router";
import { caseInteractionsRouter } from "./routes/case-interactions.router";
import { caseCommitmentsRouter } from "./routes/case-commitments.router";
import { caseReferralsRouter } from "./routes/case-referrals.router";
import { consultantReferralsRouter } from "./routes/consultant-referrals.router";
import { caseDocumentsRouter } from "./routes/case-documents.router";
import { caseSharedTemplatesRouter } from "./routes/shared-templates.router";
import { commitmentsRouter } from "./routes/commitments.router";
import { caseTasksRouter } from "./routes/case-tasks.router";
import { tasksRouter } from "./routes/tasks.router";
import { searchRouter } from "./routes/search.router";
import { notificationsRouter } from "./routes/notifications.router";
import { grievancesRouter } from "./routes/grievances.router";
import {
  workflowTemplatesRouter,
  platformWorkflowTemplateModerationRouter,
} from "./routes/workflow-templates.router";
import { workflowsRouter } from "./routes/workflows.router";
import { platformWorkflowsRouter } from "./routes/platform-workflows.router";
import { workflowRunsRouter } from "./routes/workflow-runs.router";
import { formTemplatesRouter } from "./routes/form-templates.router";
import {
  caseFormSubmissionsRouter,
  publicFormSubmissionsRouter,
} from "./routes/form-submissions.router";
import {
  caseAppointmentsRouter,
  caseAppointmentSeriesRouter,
  appointmentSeriesRouter,
  appointmentsRouter,
} from "./routes/appointments.router";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { tenantContextMiddleware } from "./middleware/tenant-context";
import { startExpireRequestsCron } from "./cron/expire-requests";
import { startTasksOverdueCron } from "./cron/tasks-overdue";
import { startTaskRemindersCron } from "./cron/task-reminders";
import { startRemindersCron } from "./cron/reminders";
import { startWorkflowTriggersCron } from "./cron/workflow-triggers";
import { startDailyConsultantScheduleCron } from "./cron/daily-consultant-schedule";
import { startWorkflowWorker } from "./queue/workflow.handler";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check — must stay ahead of authMiddleware; load balancers/uptime
// checks hit this with no token.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// apps/api has no credential routes of its own — apps/web talks to Supabase
// Auth directly (data_api_v4.md §1.1/§3). This process only verifies tokens
// it's handed. The unauthenticated public tenant site (data_api_v4.md §9 —
// tenant landing page, public consultant profiles, public available-slots)
// isn't built yet; every route below requires a bearer token.

// POST /auth/register-profile must work with only a Supabase token — no
// `users` row exists yet at that point, so it precedes authMiddleware and
// verifies the token itself (see auth-register.router.ts).
app.use("/api/auth", authRegisterRouter);

// Google's OAuth redirect lands here with no Authorization header, so it
// must precede authMiddleware too — see google-oauth-callback.router.ts.
app.use("/api/integrations", googleOAuthCallbackRouter);

// The intake-form public fill link (emailed/WhatsApp'd by SEND_INTAKE_FORM)
// works with no login — the accessToken itself is the security boundary,
// so this must precede authMiddleware too. See form-submissions.router.ts.
app.use("/api/forms", publicFormSubmissionsRouter);

// Protected routes — authMiddleware verifies identity, tenantContextMiddleware
// then resolves + verifies tenant scope (see middleware/tenant-context.ts).
// Requires apps/web to call this API through the tenant's subdomain host
// (`{slug}.<TENANT_ROOT_HOST>`) or send an `X-Tenant-Slug` header.
app.use(authMiddleware);
// GET /auth/me must work before a tenant slug is known — it's how the
// generic (non-subdomain) sign-in flow discovers which tenant to redirect
// to — so it's mounted ahead of tenantContextMiddleware. It doesn't read
// req.tenant/req.tenantContext, only req.user.
app.use("/api/auth", meRouter);
// Same reasoning as GET /auth/me above — a CLIENT has no home tenant to
// resolve, so their own cross-tenant profile route must precede
// tenantContextMiddleware too (see clients.router.ts's platformClientsRouter).
app.use("/api/clients", platformClientsRouter);
app.use("/api/clients/consultant-applications", platformConsultantApplicationsRouter);
app.use("/api/clients/consultant-invite-codes", platformConsultantInviteCodesRouter);
// Same reasoning again — TENANT_ADMIN, CONSULTANT, and CLIENT all connect
// their own Gmail inbox independently (inbox.router.ts), and CLIENT has no
// tenantId to nest a /tenants/:tenantId route under.
app.use("/api/inbox", inboxRouter);
app.use(tenantContextMiddleware);
app.use("/api/platform/dashboard", platformDashboardRouter);
app.use("/api/platform/grievances", platformGrievancesRouter);
app.use("/api/platform/notify", platformNotifyRouter);
app.use("/api/platform/workflow-templates", platformWorkflowTemplateModerationRouter);
app.use("/api/platform/workflows", platformWorkflowsRouter);
app.use("/api/platform/audit-log", platformAuditLogRouter);
app.use("/api/platform/tenants", platformTenantsRouter);
app.use("/api/tenants/:tenantId", tenantSettingsRouter);
app.use("/api/tenants/:tenantId/audit-log", tenantAuditLogRouter);
app.use("/api/tenants/:tenantId/users", usersRouter);
app.use("/api/tenants/:tenantId/clients", clientsRouter);
app.use("/api/tenants/:tenantId/guardian-links", guardianLinksRouter);
app.use("/api/tenants/:tenantId/consultants", consultantsRouter);
app.use("/api/tenants/:tenantId/search", searchRouter);
app.use("/api/tenants/:tenantId/consultant-applications", consultantApplicationsRouter);
app.use("/api/tenants/:tenantId/consultant-invite-codes", consultantInviteCodesRouter);
app.use("/api/tenants/:tenantId/availability-slots", availabilitySlotsRouter);
app.use("/api/tenants/:tenantId/availability-defaults", availabilityDefaultsRouter);
app.use("/api/tenants/:tenantId/out-of-office", outOfOfficeRouter);
app.use("/api/tenants/:tenantId/verification-documents", verificationDocumentsRouter);
app.use("/api/tenants/:tenantId/contacts", contactsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointments", caseAppointmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointment-series", caseAppointmentSeriesRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/interactions", caseInteractionsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/commitments", caseCommitmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/refer", caseReferralsRouter);
app.use("/api/tenants/:tenantId/consultant-referrals", consultantReferralsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/documents", caseDocumentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/form-submissions", caseFormSubmissionsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/shared-templates", caseSharedTemplatesRouter);
app.use("/api/tenants/:tenantId/commitments", commitmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/tasks", caseTasksRouter);
app.use("/api/tenants/:tenantId/tasks", tasksRouter);
app.use("/api/tenants/:tenantId/cases", casesRouter);
app.use("/api/tenants/:tenantId/appointment-series", appointmentSeriesRouter);
app.use("/api/tenants/:tenantId/appointments", appointmentsRouter);
app.use("/api/tenants/:tenantId", notificationsRouter);
app.use("/api/tenants/:tenantId", grievancesRouter);
app.use("/api/tenants/:tenantId/workflow-templates", workflowTemplatesRouter);
app.use("/api/tenants/:tenantId/form-templates", formTemplatesRouter);
app.use("/api/tenants/:tenantId/workflows", workflowsRouter);
app.use("/api/tenants/:tenantId/workflows/:workflowId/runs", workflowRunsRouter);

// Error handling
app.use(errorHandler);

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});

startExpireRequestsCron();
startTasksOverdueCron();
startTaskRemindersCron();
startRemindersCron();
startWorkflowTriggersCron();
startDailyConsultantScheduleCron();
startWorkflowWorker();
