import "dotenv/config";
// Patches express.Router so a rejected promise/thrown error inside an async
// route handler reaches errorHandler via next(err) instead of becoming an
// unhandled rejection that crashes the process — Express 4 doesn't do this
// on its own, and every route here relies on `throw new AppError(...)`
// inside async handlers.
import "express-async-errors";
import express from "express";
import cors from "cors";
import { meRouter } from "./routes/me";
import { publicRouter } from "./routes/public.router";
import { platformTenantsRouter, tenantSettingsRouter } from "./routes/tenants.router";
import { usersRouter } from "./routes/users.router";
import { clientsRouter, guardianLinksRouter } from "./routes/clients.router";
import {
  consultantsRouter,
  availabilitySlotsRouter,
  outOfOfficeRouter,
} from "./routes/consultants.router";
import { casesRouter } from "./routes/cases.router";
import {
  caseAppointmentsRouter,
  caseAppointmentSeriesRouter,
  appointmentSeriesRouter,
  appointmentsRouter,
} from "./routes/appointments.router";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { tenantContextMiddleware } from "./middleware/tenant-context";

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
// tenant landing page) is served by publicRouter below; public consultant
// profiles and public available-slots aren't built yet. Every other route
// below requires a bearer token.
app.use("/api/public", publicRouter);

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
app.use(tenantContextMiddleware);
app.use("/api/platform/tenants", platformTenantsRouter);
app.use("/api/tenants/:tenantId", tenantSettingsRouter);
app.use("/api/tenants/:tenantId/users", usersRouter);
app.use("/api/tenants/:tenantId/clients", clientsRouter);
app.use("/api/tenants/:tenantId/guardian-links", guardianLinksRouter);
app.use("/api/tenants/:tenantId/consultants", consultantsRouter);
app.use("/api/tenants/:tenantId/availability-slots", availabilitySlotsRouter);
app.use("/api/tenants/:tenantId/out-of-office", outOfOfficeRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointments", caseAppointmentsRouter);
app.use("/api/tenants/:tenantId/cases/:caseId/appointment-series", caseAppointmentSeriesRouter);
app.use("/api/tenants/:tenantId/cases", casesRouter);
app.use("/api/tenants/:tenantId/appointment-series", appointmentSeriesRouter);
app.use("/api/tenants/:tenantId/appointments", appointmentsRouter);

// Error handling
app.use(errorHandler);

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
