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
const tenants_router_1 = require("./routes/tenants.router");
const platform_dashboard_router_1 = require("./routes/platform-dashboard.router");
const platform_grievances_router_1 = require("./routes/platform-grievances.router");
const users_router_1 = require("./routes/users.router");
const clients_router_1 = require("./routes/clients.router");
const consultants_router_1 = require("./routes/consultants.router");
const contacts_router_1 = require("./routes/contacts.router");
const cases_router_1 = require("./routes/cases.router");
const case_interactions_router_1 = require("./routes/case-interactions.router");
const case_commitments_router_1 = require("./routes/case-commitments.router");
const case_tasks_router_1 = require("./routes/case-tasks.router");
const appointments_router_1 = require("./routes/appointments.router");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const tenant_context_1 = require("./middleware/tenant-context");
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
app.use(tenant_context_1.tenantContextMiddleware);
app.use("/api/platform/dashboard", platform_dashboard_router_1.platformDashboardRouter);
app.use("/api/platform/grievances", platform_grievances_router_1.platformGrievancesRouter);
app.use("/api/platform/tenants", tenants_router_1.platformTenantsRouter);
app.use("/api/tenants/:tenantId", tenants_router_1.tenantSettingsRouter);
app.use("/api/tenants/:tenantId/users", users_router_1.usersRouter);
app.use("/api/tenants/:tenantId/clients", clients_router_1.clientsRouter);
app.use("/api/tenants/:tenantId/guardian-links", clients_router_1.guardianLinksRouter);
app.use("/api/tenants/:tenantId/consultants", consultants_router_1.consultantsRouter);
app.use("/api/tenants/:tenantId/availability-slots", consultants_router_1.availabilitySlotsRouter);
app.use("/api/tenants/:tenantId/out-of-office", consultants_router_1.outOfOfficeRouter);
app.use("/api/tenants/:tenantId/verification-documents", consultants_router_1.verificationDocumentsRouter);
app.use("/api/tenants/:tenantId/contacts", contacts_router_1.contactsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointments", appointments_router_1.caseAppointmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointment-series", appointments_router_1.caseAppointmentSeriesRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/interactions", case_interactions_router_1.caseInteractionsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/commitments", case_commitments_router_1.caseCommitmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/tasks", case_tasks_router_1.caseTasksRouter);
app.use("/api/tenants/:tenantId/cases", cases_router_1.casesRouter);
app.use("/api/tenants/:tenantId/appointment-series", appointments_router_1.appointmentSeriesRouter);
app.use("/api/tenants/:tenantId/appointments", appointments_router_1.appointmentsRouter);
// Error handling
app.use(errorHandler_1.errorHandler);
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`API server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map