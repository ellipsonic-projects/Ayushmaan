# Ayushman — Project Structure (Multi-Tenant Edition, Next.js + Express Monorepo)

Derived from `PRD_v3_nextjs_express.md` and `schema_ayushman_v3.md`.
Stack: Turborepo monorepo — Next.js 16 (`apps/web`) + Express (`apps/api`) + Prisma (`packages/db`) + Supabase (Postgres/RLS/Auth/Storage) + Pinecone + Razorpay + Twilio/Resend.

> This is a ground-up rewrite of the v2 project structure, not an edit of it. The single biggest change: **there is no `app/api/` inside the frontend anymore.** Every route handler that used to live in Next.js moved to `apps/api`, and `apps/web` talks to it exclusively over HTTP (PRD §7.2). Every folder below is justified against a specific PRD section or schema table — nothing is included "because v2 had it."

```
ayushman/
├── turbo.json                                     # pipeline: build/lint/typecheck/test across apps/* and packages/*
├── package.json                                   # workspaces: ["apps/*", "packages/*"]
├── tsconfig.base.json
├── .env.example                                    # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, PINECONE_*, RAZORPAY_*, TWILIO_*, RESEND_*
│
├── packages/
│   ├── db/                                         # PRD §7.2 — the ONLY package that imports Prisma; only apps/api depends on it
│   │   ├── prisma/
│   │   │   ├── schema.prisma                       # mirrors schema_ayushman_v3.md §3 table-for-table
│   │   │   ├── migrations/
│   │   │   │   ├── 0001_tenants_users/              # tenants + users, FK deferred (schema §3.4 note on provisioned_by)
│   │   │   │   ├── 0002_fk_tenants_provisioned_by/  # resolves the circular dependency, per schema §6 Migration Strategy
│   │   │   │   ├── 0003_client_consultant_profiles/ # client_profiles, client_category_profiles, guardian_links, consultant_profiles, availability_slots, out_of_office_periods
│   │   │   │   ├── 0004_cases_bookings/             # cases, appointment_series, appointments
│   │   │   │   ├── 0005_session_logging/            # interactions, commitment_templates, commitments, tasks, task_reminders, documents
│   │   │   │   ├── 0006_ai_rag/                     # chat_messages, ai_summaries, rag_citations
│   │   │   │   ├── 0007_reviews_grievances/         # reviews (+ rating_avg trigger), grievances
│   │   │   │   ├── 0008_growth_analytics/           # consultant_analytics_snapshot, referrals, consultant_referrals
│   │   │   │   ├── 0009_notifications_audit/        # notifications, notification_preferences, audit_logs, push_subscriptions
│   │   │   │   └── 0010_consultant_verification/    # consultant_verification_documents — deliberately LAST (schema §3.25: nothing else depends on this table existing)
│   │   │   └── seed.ts                              # seeds one demo tenant + Tenant Admin + Consultant so apps/api has something to boot against locally
│   │   ├── src/
│   │   │   ├── client.ts                            # exported Prisma client singleton — the only thing apps/api imports from this package
│   │   │   └── rls-context.ts                        # `withTenantContext(tx, {tenantId, isSuperAdmin, userId})` — wraps a Prisma transaction in the SET LOCAL calls RLS depends on (schema §4.1)
│   │   └── package.json
│   │
│   ├── types/                                       # single source of truth for shapes both apps/web and apps/api use — prevents the two apps' request/response types from drifting apart
│   │   ├── src/
│   │   │   ├── entities.ts                          # Tenant, Case, Appointment, Grievance, etc. — hand-written, mirrors schema §3 (not generated from Prisma, so apps/web can import it without pulling in Prisma)
│   │   │   ├── roles.ts                             # UserRole, permission-matrix helpers (mirrors PRD §1.4)
│   │   │   └── api-contracts/                       # Zod schemas per endpoint — imported by apps/api for request validation AND by apps/web for the matching SWR fetcher's response type
│   │   │       ├── cases.ts
│   │   │       ├── appointments.ts
│   │   │       ├── grievances.ts
│   │   │       └── ... (one file per resource, growing with apps/api/src/routes)
│   │   └── package.json
│   │
│   ├── ui/                                          # shared Tailwind/Radix primitives — only created once apps/web's component count justifies extraction; empty scaffold until then
│   │   ├── src/
│   │   └── package.json
│   │
│   └── config/
│       ├── eslint-config/
│       ├── tsconfig/
│       └── tailwind-config/
│
├── supabase/                                        # Supabase project config — lives outside both apps because it's infra, not application code
│   ├── auth-hooks/
│   │   └── stamp-tenant-claim.sql                    # Postgres Auth Hook stamping tenant_id/is_super_admin onto the JWT at sign-in (PRD §7.3) — this is what apps/api's tenant middleware later reads
│   ├── policies/                                     # raw SQL mirror of schema §4 (RLS) — kept separate from prisma/migrations so a security review doesn't have to diff schema changes too
│   │   ├── 01_tenant_isolation_generic.sql           # schema §4.1 — applied per-table
│   │   ├── 02_tenant_admin_escalation_fn.sql         # schema §4.2 — tenant_admin_view_case()
│   │   └── 03_grievance_exception.sql                # schema §4.3 — the one table without the generic policy
│   └── storage-policies/
│       └── tenant-case-prefix.sql                    # cases/{tenantSlug}/{caseId}/... path scoping for Supabase Storage
```

```
├── apps/
│   ├── api/                                          # Express — every route handler that used to be app/api/**/route.ts in v2 lives here now (PRD §7.2, §7.5)
│   │   ├── src/
│   │   │   ├── server.ts                             # Express app bootstrap, mounts routers, starts node-cron jobs
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── tenant-context.ts                 # PRD Phase 0 deliverable, §7.5: verifies the Supabase JWT (auth.getUser()), reads tenant_id/is_super_admin/role off it, opens a Prisma transaction via packages/db's withTenantContext — this is the real enforcement boundary schema §4.1 depends on, not apps/web's middleware
│   │   │   │   ├── require-role.ts                   # route-level guard mirroring PRD §1.4's permission matrix (e.g. blocks CONSULTANT from tenant-admin-only routes)
│   │   │   │   └── error-handler.ts
│   │   │   │
│   │   │   ├── routes/                               # one router per schema entity group; each file below corresponds 1:1 to a table or table-cluster in schema §3
│   │   │   │   ├── tenants.router.ts                 # tenants, tenant_settings, tenant_billing (§3.1–3.3) — Super Admin CRUD + provisioning
│   │   │   │   ├── users.router.ts                   # users (§3.4) — invite/deactivate, role assignment
│   │   │   │   ├── clients.router.ts                 # client_profiles, client_category_profiles, guardian_links (§3.5–3.7)
│   │   │   │   ├── consultants.router.ts             # consultant_profiles, availability_slots, out_of_office_periods (§3.8–3.10)
│   │   │   │   ├── cases.router.ts                   # cases (§3.11)
│   │   │   │   ├── appointments.router.ts            # appointment_series + appointments (§3.12), incl. approve/reschedule/cancel-whole-series actions
│   │   │   │   ├── interactions.router.ts            # interactions (§3.13) — session notes, ad-hoc notes, call logs
│   │   │   │   ├── commitments-tasks.router.ts       # commitment_templates, commitments, tasks, task_reminders (§3.14–3.15)
│   │   │   │   ├── documents.router.ts               # documents (§3.16) — upload issues a Supabase Storage signed URL, never a raw bucket credential
│   │   │   │   ├── ai.router.ts                      # chat_messages, ai_summaries, rag_citations (§3.17) — chat + "generate session recap"
│   │   │   │   ├── reviews.router.ts                 # reviews (§3.18)
│   │   │   │   ├── grievances.router.ts              # grievances (§3.19) — the one router with its own auth branch: Client submit/view-own, Super Admin triage-all, no Tenant Admin route at all (schema §4.3)
│   │   │   │   ├── analytics.router.ts               # consultant_analytics_snapshot (§3.20) — read-only; writes only ever come from the cron job, never a user request
│   │   │   │   ├── referrals.router.ts               # referrals, consultant_referrals (§3.21)
│   │   │   │   ├── notifications.router.ts           # notifications, notification_preferences (§3.22)
│   │   │   │   ├── audit-log.router.ts               # audit_logs (§3.23) — read-only, Super Admin (global) and Tenant Admin (own tenant) views
│   │   │   │   ├── push-subscriptions.router.ts      # push_subscriptions (§3.24)
│   │   │   │   ├── verification-documents.router.ts # consultant_verification_documents (§3.25) — flagged LAST in both the schema and here; no other router depends on this one
│   │   │   │   └── payments.router.ts                # checkout + Razorpay webhook — see the open note below on the missing `payments` table
│   │   │   │
│   │   │   ├── services/                             # business logic that spans more than one table/route — kept out of routers so routers stay thin
│   │   │   │   ├── booking.service.ts                # slot-conflict checks, series expansion/approval, waitlist promotion
│   │   │   │   ├── rag.service.ts                     # PRD §1.2 "never left to prompt instructions" rule lives here: the only place a Pinecone query is issued, and it hard-requires tenantId + caseId
│   │   │   │   ├── audit.service.ts                   # writes audit_logs rows for both the Tenant Admin escalation path (schema §4.2) and the Super Admin cross-tenant bypass (schema §4.4/generic policy) — one function, two callers
│   │   │   │   ├── analytics.service.ts               # computes consultant_analytics_snapshot rows (booked hours, cancellation rate, repeat-booking rate)
│   │   │   │   └── grievance.service.ts               # routing/severity logic — notifies Super Admin, SMS if CRITICAL (PRD §4.1)
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   ├── supabase-admin.ts                 # service-role client — JWT verification, Storage signed URLs, Auth Hook management; the ONLY place a service-role key is used
│   │   │   │   ├── pinecone.ts                        # namespaced-per-tenant client
│   │   │   │   ├── razorpay.ts
│   │   │   │   ├── whisper.ts                         # async transcription job dispatch
│   │   │   │   ├── twilio.ts                          # SMS/WhatsApp
│   │   │   │   └── resend.ts                          # email, tenant-branded templates
│   │   │   │
│   │   │   ├── cron/                                  # node-cron jobs, registered at server.ts startup — PRD §7.4 dependency, replaces the v2 app/api/cron/route.ts pattern
│   │   │   │   ├── end-of-day-digest.ts
│   │   │   │   ├── analytics-snapshot.ts             # populates consultant_analytics_snapshot nightly
│   │   │   │   ├── reminders.ts                       # due-soon tasks, join-soon appointments, out-of-office auto-replies
│   │   │   │   └── waitlist-sweep.ts
│   │   │   │
│   │   │   └── webhooks/
│   │   │       ├── razorpay.webhook.ts
│   │   │       └── transcription.webhook.ts           # Whisper async callback
│   │   │
│   │   ├── tests/
│   │   │   ├── integration/
│   │   │   │   └── rls-policies.test.ts              # verifies tenant isolation + the grievance exception end-to-end through apps/api, not just at the SQL level
│   │   │   └── unit/
│   │   ├── package.json                               # depends on packages/db, packages/types
│   │   └── tsconfig.json
│   │
│   └── web/                                          # Next.js 16 — pages, layouts, and UI only; every data mutation/read goes through apps/api (PRD §7.5)
│       ├── middleware.ts                              # PRD Phase 0: subdomain → tenant resolution for UI ROUTING ONLY (theming, redirect, SUSPENDED-tenant block) — never the security boundary; that's apps/api's tenant-context middleware
│       │
│       ├── app/
│       │   ├── (platform)/                            # admin.ayushman.app — Super Admin console (PRD §5 Phase 1)
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── tenants/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [tenantId]/page.tsx
│       │   │   ├── billing/page.tsx
│       │   │   ├── audit-log/page.tsx
│       │   │   ├── grievances/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [grievanceId]/page.tsx
│       │   │   └── settings/page.tsx
│       │   │
│       │   ├── (auth)/                                # PRD Phase 0 — pages call Supabase Auth directly via @supabase/ssr, not apps/api (PRD §7.3)
│       │   │                                          # SHARED, GENERIC bundle: one login/reset-password UI, no tenant theming, wrapped only by the tenant-agnostic root layout.tsx.
│       │   │                                          # Resolves at any tenant's subdomain ({slug}.ayushman.app/login) — middleware.ts routes it here without attaching theme_config, so it renders identically everywhere.
│       │   │   ├── login/page.tsx
│       │   │   ├── reset-password/page.tsx
│       │   │   └── register/page.tsx                  # tenant-scoped in DATA (signs the client up under the current subdomain's tenant_id) but same generic UI as login/reset-password
│       │   │
│       │   ├── (tenant)/
│       │   │   └── [slug]/
│       │   │       ├── layout.tsx                      # the ONLY place theme_config/logo is injected — everything below this line (public landing, admin, consultant, client) is tenant-branded; (auth) above is not
│       │   │       │
│       │   │       ├── (public)/                       # no auth — PRD Phase 4
│       │   │       │   ├── page.tsx                    # tenant landing
│       │   │       │   ├── book/page.tsx                # slot picker, series booking, waitlist opt-in
│       │   │       │   └── help/page.tsx                # rule-based FAQ chat
│       │   │       │
│       │   │       ├── (admin)/                        # Tenant Admin back-office — PRD Phase 2
│       │   │       │   ├── onboarding/page.tsx
│       │   │       │   ├── consultants/
│       │   │       │   │   ├── page.tsx
│       │   │       │   │   └── [consultantId]/page.tsx
│       │   │       │   ├── settings/page.tsx
│       │   │       │   ├── billing/page.tsx
│       │   │       │   ├── disputes/page.tsx
│       │   │       │   └── audit-log/page.tsx           # tenant-scoped view; calls GET /audit-log (own-tenant filter enforced server-side by apps/api, not by this page)
│       │   │       │
│       │   │       ├── (consultant)/                   # Consultant workspace — PRD Phases 3, 5–10
│       │   │       │   ├── onboarding/page.tsx          # category, bio, fee, languages — does NOT include verification doc upload (moved to its own page below, per schema §3.25's last-phase placement)
│       │   │       │   ├── dashboard/page.tsx           # morning briefing, burnout indicator
│       │   │       │   ├── appointments/page.tsx
│       │   │       │   ├── availability/page.tsx        # + smart slot suggestions
│       │   │       │   ├── out-of-office/page.tsx
│       │   │       │   ├── profile/page.tsx
│       │   │       │   ├── clients/
│       │   │       │   │   ├── page.tsx                 # search, pinning, CRM tags
│       │   │       │   │   └── [caseId]/
│       │   │       │   │       ├── page.tsx             # case timeline
│       │   │       │   │       └── ai/page.tsx          # case-scoped RAG chat panel
│       │   │       │   ├── sessions/
│       │   │       │   │   └── [appointmentId]/page.tsx
│       │   │       │   ├── referrals/page.tsx           # cross-consultant referral queue
│       │   │       │   ├── referral-program/page.tsx    # client-invite-a-client config
│       │   │       │   ├── analytics/page.tsx
│       │   │       │   ├── payouts/page.tsx
│       │   │       │   └── verification/page.tsx        # NEW location: consultant_verification_documents upload — deliberately last in the build plan (schema §3.25), split out of onboarding/ so shipping it late doesn't block onboarding/profile/booking
│       │   │       │
│       │   │       ├── (client)/                       # Client-facing dashboard — PRD Phases 4–10
│       │   │       │   ├── dashboard/page.tsx
│       │   │       │   ├── appointments/page.tsx
│       │   │       │   ├── cases/
│       │   │       │   │   └── [caseId]/
│       │   │       │   │       ├── page.tsx
│       │   │       │   │       └── ai-summary/page.tsx
│       │   │       │   ├── tasks/page.tsx
│       │   │       │   ├── payments/page.tsx
│       │   │       │   ├── appointments/[id]/review/page.tsx
│       │   │       │   ├── refer/page.tsx
│       │   │       │   └── report/page.tsx              # grievance submission — platform-level, always visible regardless of tenant (PRD §4.1)
│       │   │       │
│       │   │       └── (*)/                            # shared across roles within a tenant
│       │   │           ├── notifications/page.tsx
│       │   │           └── profile/settings/page.tsx
│       │   │
│       │   ├── layout.tsx                              # root layout — tenant-agnostic (fonts, providers, global CSS only); does NOT read theme_config, which is what keeps (platform) and (auth) generic
│       │   └── globals.css
│       │
│       ├── components/                                 # unchanged in spirit from v2 — this layer doesn't care whether the backend is Next.js routes or Express
│       │   ├── ui/
│       │   ├── layout/
│       │   │   ├── TenantNav.tsx
│       │   │   ├── PlatformNav.tsx
│       │   │   └── RoleGuard.tsx                        # client-side convenience only; the real check is apps/api's require-role middleware
│       │   ├── booking/
│       │   │   ├── SlotPicker.tsx
│       │   │   ├── SeriesBookingForm.tsx
│       │   │   └── WaitlistToggle.tsx
│       │   ├── session/
│       │   │   ├── AudioRecorder.tsx
│       │   │   ├── QuickCaptureWidget.tsx
│       │   │   └── CommitmentTaskTemplates.tsx
│       │   ├── timeline/
│       │   │   ├── CaseTimeline.tsx
│       │   │   └── TimelineExportButton.tsx
│       │   ├── clients/
│       │   │   ├── ClientSearchPin.tsx
│       │   │   └── CrmTagManager.tsx
│       │   ├── ai/
│       │   │   ├── ChatPanel.tsx
│       │   │   └── CitationLink.tsx
│       │   ├── grievance/
│       │   │   ├── GrievanceForm.tsx
│       │   │   └── GrievanceStatusTracker.tsx
│       │   ├── referrals/
│       │   │   ├── CrossConsultantReferralModal.tsx
│       │   │   └── ClientReferralCard.tsx
│       │   ├── analytics/
│       │   │   ├── BurnoutIndicator.tsx
│       │   │   └── SlotHeatmap.tsx
│       │   ├── verification/
│       │   │   └── VerificationDocUploader.tsx          # matches app/(consultant)/verification/page.tsx above
│       │   └── notifications/
│       │       └── NotificationPreferences.tsx
│       │
│       ├── lib/                                         # what's LEFT after moving business logic to apps/api — thin, frontend-only concerns
│       │   ├── supabase/
│       │   │   ├── client.ts                           # @supabase/ssr browser client — session cookie handling
│       │   │   └── server.ts                            # @supabase/ssr server client — used only for reading the current session in a Server Component, never for DB queries
│       │   ├── api/
│       │   │   ├── http-client.ts                        # thin fetch wrapper: attaches the Supabase access token to every call to apps/api
│       │   │   └── fetchers/                              # one SWR fetcher module per apps/api router — mirrors packages/types/api-contracts 1:1
│       │   │       ├── cases.ts
│       │   │       ├── appointments.ts
│       │   │       ├── grievances.ts
│       │   │       └── ...
│       │   ├── tenant/
│       │   │   ├── resolve-tenant.ts                     # subdomain → tenant lookup, used by middleware.ts (UI routing only, per PRD §1.2)
│       │   │   └── theme.ts
│       │   └── validation/
│       │       └── (re-exports packages/types/api-contracts — no schemas defined locally, to avoid drift)
│       │
│       ├── hooks/
│       │   ├── useTenant.ts
│       │   ├── useRole.ts
│       │   ├── useOfflineDraft.ts                        # offline-safe note drafts (local browser storage, synced on reconnect)
│       │   └── useKeyboardShortcuts.ts
│       │
│       ├── public/
│       │   └── assets/
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── package.json                                  # depends on packages/types, packages/ui — NOT packages/db
│       └── tsconfig.json
│
├── e2e/                                                  # cross-app tests — lives outside both apps/* since it exercises web + api together
│   └── booking-flow.spec.ts
│
└── README.md
```

## Notes on how this maps back to the docs

- **`apps/web` has zero backend logic.** No `app/api/`, no Prisma import, no direct Postgres connection anywhere in this tree — every mutation and read goes through `apps/api` over HTTP (PRD §7.2, §7.5). This is the structural difference from the v2 project structure; everything else below is the same business surface re-hung on the new skeleton.
- **`apps/api/src/middleware/tenant-context.ts` is the real security boundary**, not `apps/web/middleware.ts`. The frontend's middleware only decides what to render; the backend's middleware is what sets `app.tenant_id`/`app.is_super_admin` for RLS (schema §4.1, PRD §1.2/§7.3). Route groups in `apps/web/app/` still follow PRD §5's exact convention so page-level access lines up with the PRD §1.4 permission matrix, but that alignment is a UX nicety, not the enforcement.
- **Every `apps/api/src/routes/*.router.ts` file corresponds to a specific schema §3 table or table-cluster** — this was checked table-by-table against `schema_ayushman_v3.md` rather than carried over from the v2 route list, which is why the file list above doesn't exactly match v2's `app/api/` folder (e.g., `otp`/`session` routes are gone entirely, since Supabase Auth owns that surface now).
- **`consultant_verification_documents` is deliberately split out of onboarding**, both in the schema (§3.25, last table) and here (`(consultant)/verification/page.tsx`, its own route rather than a step inside `onboarding/page.tsx`) — reflecting the review decision to defer this feature to the last development phase without blocking a consultant from being bookable in the meantime.
- **`packages/types/api-contracts/`** is what keeps `apps/web`'s fetchers and `apps/api`'s request validation from drifting apart now that they're two separate deployable apps instead of one Next.js project — a schema changes once, both sides import it.
- **`supabase/`** stays outside both apps, same as v2 — it's Supabase project configuration (Auth Hook, RLS policies, Storage policies), not application code, and needs to be deployable independently of either app's release cycle.
- Build order still follows the PRD's Phase 0–11 sequence; within that, `packages/db`'s migrations are ordered so `0010_consultant_verification` is last, matching the phase deferral above.
- **Per-tenant landing page, shared login — by construction, not convention.** Only `(tenant)/[slug]/layout.tsx` reads `tenant_settings.theme_config`; `(auth)` and `(platform)` sit outside that layout's subtree and are wrapped only by the tenant-agnostic root `layout.tsx`. That's the entire mechanism: there's no per-tenant `login/page.tsx` to accidentally diverge, and no conditional "if tenant X, use theme Y" branch to maintain in the auth pages. Consultants and Clients on every tenant subdomain hit the identical `/login` bundle; the only thing that changes tenant-to-tenant is what's rendered under `[slug]/(public)`.

## Resolved item

`apps/api/src/routes/payments.router.ts` and the ERD in `schema_ayushman_v3.md` §1 both reference a `payments` table (e.g., `appointments ──► payments`); the table is now defined at `schema_ayushman_v3.md` §3.26, matching the actual `packages/db/prisma/schema.prisma` `Payment` model documented in `Ayushman_data_api_v4.md` §24 (Stripe-based — `stripePaymentIntentId`/`stripeCustomerId`, not Razorpay).
