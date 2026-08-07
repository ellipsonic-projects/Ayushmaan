"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// Must be imported before any router files: it patches Express's
// Router/Route prototype methods so a rejected promise from an `async`
// route handler is forwarded to errorHandler instead of becoming an
// unhandled rejection that crashes the whole process.
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const me_1 = require("./routes/me");
const auth_register_router_1 = require("./routes/auth-register.router");
const tenants_router_1 = require("./routes/tenants.router");
const platform_dashboard_router_1 = require("./routes/platform-dashboard.router");
const platform_grievances_router_1 = require("./routes/platform-grievances.router");
const platform_notify_router_1 = require("./routes/platform-notify.router");
const audit_log_router_1 = require("./routes/audit-log.router");
const users_router_1 = require("./routes/users.router");
const clients_router_1 = require("./routes/clients.router");
const consultants_router_1 = require("./routes/consultants.router");
const consultant_applications_router_1 = require("./routes/consultant-applications.router");
const consultant_invite_codes_router_1 = require("./routes/consultant-invite-codes.router");
const contacts_router_1 = require("./routes/contacts.router");
const inbox_router_1 = require("./routes/inbox.router");
const google_oauth_callback_router_1 = require("./routes/google-oauth-callback.router");
const cases_router_1 = require("./routes/cases.router");
const case_interactions_router_1 = require("./routes/case-interactions.router");
const case_commitments_router_1 = require("./routes/case-commitments.router");
const case_referrals_router_1 = require("./routes/case-referrals.router");
const consultant_referrals_router_1 = require("./routes/consultant-referrals.router");
const case_documents_router_1 = require("./routes/case-documents.router");
const shared_templates_router_1 = require("./routes/shared-templates.router");
const commitments_router_1 = require("./routes/commitments.router");
const case_tasks_router_1 = require("./routes/case-tasks.router");
const tasks_router_1 = require("./routes/tasks.router");
const search_router_1 = require("./routes/search.router");
const notifications_router_1 = require("./routes/notifications.router");
const grievances_router_1 = require("./routes/grievances.router");
const workflow_templates_router_1 = require("./routes/workflow-templates.router");
const workflows_router_1 = require("./routes/workflows.router");
const platform_workflows_router_1 = require("./routes/platform-workflows.router");
const workflow_runs_router_1 = require("./routes/workflow-runs.router");
const form_templates_router_1 = require("./routes/form-templates.router");
const form_submissions_router_1 = require("./routes/form-submissions.router");
const appointments_router_1 = require("./routes/appointments.router");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const tenant_context_1 = require("./middleware/tenant-context");
const expire_requests_1 = require("./cron/expire-requests");
const tasks_overdue_1 = require("./cron/tasks-overdue");
const task_reminders_1 = require("./cron/task-reminders");
const reminders_1 = require("./cron/reminders");
const workflow_triggers_1 = require("./cron/workflow-triggers");
const daily_consultant_schedule_1 = require("./cron/daily-consultant-schedule");
const workflow_handler_1 = require("./queue/workflow.handler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use("/api/auth", auth_register_router_1.authRegisterRouter);
// Google's OAuth redirect lands here with no Authorization header, so it
// must precede authMiddleware too — see google-oauth-callback.router.ts.
app.use("/api/integrations", google_oauth_callback_router_1.googleOAuthCallbackRouter);
// The intake-form public fill link (emailed/WhatsApp'd by SEND_INTAKE_FORM)
// works with no login — the accessToken itself is the security boundary,
// so this must precede authMiddleware too. See form-submissions.router.ts.
app.use("/api/forms", form_submissions_router_1.publicFormSubmissionsRouter);
// Protected routes — authMiddleware verifies identity, tenantContextMiddleware
// then resolves + verifies tenant scope (see middleware/tenant-context.ts).
// Requires apps/web to call this API through the tenant's subdomain host
// (`{slug}.<TENANT_ROOT_HOST>`) or send an `X-Tenant-Slug` header.
app.use(auth_1.authMiddleware);
// GET /auth/me must work before a tenant slug is known — it's how the
// generic (non-subdomain) sign-in flow discovers which tenant to redirect
// to — so it's mounted ahead of tenantContextMiddleware. It doesn't read
// req.tenant/req.tenantContext, only req.user.
app.use("/api/auth", me_1.meRouter);
// Same reasoning as GET /auth/me above — a CLIENT has no home tenant to
// resolve, so their own cross-tenant profile route must precede
// tenantContextMiddleware too (see clients.router.ts's platformClientsRouter).
app.use("/api/clients", clients_router_1.platformClientsRouter);
app.use("/api/clients/consultant-applications", consultant_applications_router_1.platformConsultantApplicationsRouter);
app.use("/api/clients/consultant-invite-codes", consultant_invite_codes_router_1.platformConsultantInviteCodesRouter);
// Same reasoning again — TENANT_ADMIN, CONSULTANT, and CLIENT all connect
// their own Gmail inbox independently (inbox.router.ts), and CLIENT has no
// tenantId to nest a /tenants/:tenantId route under.
app.use("/api/inbox", inbox_router_1.inboxRouter);
app.use(tenant_context_1.tenantContextMiddleware);
app.use("/api/platform/dashboard", platform_dashboard_router_1.platformDashboardRouter);
app.use("/api/platform/grievances", platform_grievances_router_1.platformGrievancesRouter);
app.use("/api/platform/notify", platform_notify_router_1.platformNotifyRouter);
app.use("/api/platform/workflow-templates", workflow_templates_router_1.platformWorkflowTemplateModerationRouter);
app.use("/api/platform/workflows", platform_workflows_router_1.platformWorkflowsRouter);
app.use("/api/platform/audit-log", audit_log_router_1.platformAuditLogRouter);
app.use("/api/platform/tenants", tenants_router_1.platformTenantsRouter);
app.use("/api/tenants/:tenantId", tenants_router_1.tenantSettingsRouter);
app.use("/api/tenants/:tenantId/audit-log", audit_log_router_1.tenantAuditLogRouter);
app.use("/api/tenants/:tenantId/users", users_router_1.usersRouter);
app.use("/api/tenants/:tenantId/clients", clients_router_1.clientsRouter);
app.use("/api/tenants/:tenantId/guardian-links", clients_router_1.guardianLinksRouter);
app.use("/api/tenants/:tenantId/consultants", consultants_router_1.consultantsRouter);
app.use("/api/tenants/:tenantId/search", search_router_1.searchRouter);
app.use("/api/tenants/:tenantId/consultant-applications", consultant_applications_router_1.consultantApplicationsRouter);
app.use("/api/tenants/:tenantId/consultant-invite-codes", consultant_invite_codes_router_1.consultantInviteCodesRouter);
app.use("/api/tenants/:tenantId/availability-slots", consultants_router_1.availabilitySlotsRouter);
app.use("/api/tenants/:tenantId/availability-defaults", consultants_router_1.availabilityDefaultsRouter);
app.use("/api/tenants/:tenantId/out-of-office", consultants_router_1.outOfOfficeRouter);
app.use("/api/tenants/:tenantId/verification-documents", consultants_router_1.verificationDocumentsRouter);
app.use("/api/tenants/:tenantId/contacts", contacts_router_1.contactsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointments", appointments_router_1.caseAppointmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointment-series", appointments_router_1.caseAppointmentSeriesRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/interactions", case_interactions_router_1.caseInteractionsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/commitments", case_commitments_router_1.caseCommitmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/refer", case_referrals_router_1.caseReferralsRouter);
app.use("/api/tenants/:tenantId/consultant-referrals", consultant_referrals_router_1.consultantReferralsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/documents", case_documents_router_1.caseDocumentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/form-submissions", form_submissions_router_1.caseFormSubmissionsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/shared-templates", shared_templates_router_1.caseSharedTemplatesRouter);
app.use("/api/tenants/:tenantId/commitments", commitments_router_1.commitmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/tasks", case_tasks_router_1.caseTasksRouter);
app.use("/api/tenants/:tenantId/tasks", tasks_router_1.tasksRouter);
app.use("/api/tenants/:tenantId/cases", cases_router_1.casesRouter);
app.use("/api/tenants/:tenantId/appointment-series", appointments_router_1.appointmentSeriesRouter);
app.use("/api/tenants/:tenantId/appointments", appointments_router_1.appointmentsRouter);
app.use("/api/tenants/:tenantId", notifications_router_1.notificationsRouter);
app.use("/api/tenants/:tenantId", grievances_router_1.grievancesRouter);
app.use("/api/tenants/:tenantId/workflow-templates", workflow_templates_router_1.workflowTemplatesRouter);
app.use("/api/tenants/:tenantId/form-templates", form_templates_router_1.formTemplatesRouter);
app.use("/api/tenants/:tenantId/workflows", workflows_router_1.workflowsRouter);
app.use("/api/tenants/:tenantId/workflows/:workflowId/runs", workflow_runs_router_1.workflowRunsRouter);
// Error handling
app.use(errorHandler_1.errorHandler);
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`API server running on port ${PORT}`);
});
(0, expire_requests_1.startExpireRequestsCron)();
(0, tasks_overdue_1.startTasksOverdueCron)();
(0, task_reminders_1.startTaskRemindersCron)();
(0, reminders_1.startRemindersCron)();
(0, workflow_triggers_1.startWorkflowTriggersCron)();
(0, daily_consultant_schedule_1.startDailyConsultantScheduleCron)();
(0, workflow_handler_1.startWorkflowWorker)();
//# sourceMappingURL=index.js.map