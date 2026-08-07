## Phase 0: Monorepo Foundation & Data Layer (Weeks 1–3)

**Goal**: Turborepo scaffolding, `packages/db` schema fully migrated, Supabase provisioned with Auth Hook + RLS skeleton in place. No user-facing business logic — nothing in Phase 1+ can start until a tenant and a role-bearing user can exist in the database.

### Sprint 0.1: Monorepo & Tooling Bootstrap

1. GitHub Actions CI (`.github/workflows/ci.yml`) running lint/typecheck/build across all `apps/*` and `packages/*` via `turbo run`.

Validate: test running the github actions CI

### Sprint 0.2: Supabase Provisioning & RLS Skeleton

1. Configure Supabase Storage buckets matching the tenant-prefixed path convention (`{tenantSlug}/{caseId}/...`, `{tenantSlug}/{consultantId}/...`) and write the storage policy under `supabase/storage-policies/tenant-case-prefix.sql`.

2. test by uploading a txt file for each bucket for teanntSlug="shekhareyehospital"

---

## Phase 1: Platform, Tenancy & Identity (Weeks 4–6)

**Goal**: A `SUPER_ADMIN` can provision a tenant; a user of any role can sign in and land in the correct place; every subsequent request is verifiably tenant-scoped. This phase has no consultant/client-facing product value yet — it's the gate everything else waits on (PRD §5 Phase 1 note: "tenants must exist first").

### Sprint 1.1: Super Admin Console — Tenant Provisioning

1. Build `apps/web/app/(platform)/dashboard/page.tsx` — cross-tenant KPI shell (active tenants, MRR placeholder from `tenant_billing`)
2. Enforce `SUSPENDED`/unknown-tenant handling in `apps/web/middleware.ts` (UI-level block) — this is the first thing that exercises `apps/web`'s tenant-resolution layer described.

### Sprint 1.2: Supabase Auth Integration

1. password-reset/OTP **email and phone**, based on user preference
2. **Acceptance check for this sprint:** load `/login` on two different tenant subdomains side by side — pixel-identical

### Sprint 1.3: Tenant-Scoping Middleware (the real enforcement boundary)

1. Build `require-role.ts` middleware mirroring the `docs/prd.md` 1.4 permission matrix.
2. Add `apps/api`'s global `error-handler.ts`, including a distinct error path for "JWT valid but tenant mismatch."

- confirm a `SUPER_ADMIN` token can create, read, update and delete all `cases` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").
- confirm a `SUPER_ADMIN` token can create, read, update and delete all `consultants` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").
- confirm a `SUPER_ADMIN` token can create, read, update and delete all `grievance` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").
- confirm a `SUPER_ADMIN` token can create, read, update and delete all `workflows` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").
- confirm a `SUPER_ADMIN` token can create, read, update and delete all `templates` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").
- confirm a `SUPER_ADMIN` token can create, read, update and delete all `notifications` across tenants, clients, consultants
- confirm a `SUPER_ADMIN` token can create, read, update, delete all `clients` across tenants while writing an `audit_logs` row every time it does (`docs/schema-details.md` 4, `docs/prd.md` 1.2 "unrestricted != invisible").

3. Integration test suite (`apps/api/tests/integration/rls-policies.test.ts`): confirm a `CONSULTANT` token can't read another tenant's `cases`
   confirm a `CLIENT` token c

---

## Phase 2: Tenant Onboarding, Staff & Profile Setup (Weeks 7–9)

**Goal**: A Tenant Admin can fully set up their practice and invite Consultants; Consultants and Clients have working profiles. Verification document upload is intentionally **not** part of this phase (see Phase 10).

### Sprint 2.1: Tenant Admin Onboarding & Consultant CRUD

1. Build `apps/api`'s `tenants.router.ts` additions for `tenant_settings` (currency, payout cycle, booking cutoff, auto-approve default, supported languages) and `tenant_billing` read.
2. Build `apps/web/app/(tenant)/[slug]/(admin)/onboarding/page.tsx` — branding/logo, business-hours defaults, first-Consultant invite.
3. Build `users.router.ts` + `consultants.router.ts` invite flow: Tenant Admin creates a `users` row (`role = CONSULTANT`) and a linked `consultant_profiles` row in one transaction, records `invited_by` (schema §3.8).
4. Build `apps/web/app/(tenant)/[slug]/(admin)/consultants/page.tsx` and `[consultantId]/page.tsx` (deactivate, edit, view booking/utilization stats — utilization can stub against `consultant_analytics_snapshot` until Phase 6 populates it).

### Sprint 2.2: Consultant Profile & Availability

1. Build `consultants.router.ts` profile CRUD: category, sub-specialization, bio, fee, currency, languages, `is_accepting_new_clients` toggle, per-consultant `auto_approve_bookings` override.
2. Build `apps/web/app/(tenant)/[slug]/(consultant)/onboarding/page.tsx` and `profile/page.tsx` — deliberately **excluding** any document upload step (schema §3.25 places `consultant_verification_documents` in the last build phase; see Phase 10 below).
3. Implement `availability_slots` CRUD in `consultants.router.ts`: recurring weekly template + `specific_date` overrides, `version`-column optimistic locking noted in the schema design.
4. Build `apps/web/app/(tenant)/[slug]/(consultant)/availability/page.tsx` — weekly grid + override calendar, with DST-safe slot expansion computed against the consultant's stored timezone (schema §3.9 note).
5. Build `out_of_office_periods` CRUD + `apps/web/.../out-of-office/page.tsx` (pauses new bookings, auto-reply message).

### Sprint 2.3: Client Profiles, Category Intake & Guardian Links

1. Build `clients.router.ts`: `client_profiles` CRUD, `client_category_profiles` (per-category JSONB intake, schema §3.6), `guardian_links` (minor/dependent linking + `consent_given_at` gate).
2. Build the client-side profile setup page under `(client)/` — full name, DOB (drives the generated `is_minor` column), preferred language, timezone, emergency contact.
3. Implement the guardian-consent gate at the API layer: block any booking for a minor `client_id` until `guardian_links.consent_given_at` is set.

---

## Phase 3: Booking Loop (Weeks 10–13)

**Goal**: A Client can find and book a Consultant within a tenant, including recurring series, and the Consultant can manage the resulting request queue. This is direct, tenant-scoped booking — no cross-tenant discovery exists anywhere in this system.

### Sprint 3.1: Public Tenant Landing & Book Page

1. Build `apps/web/app/(tenant)/[slug]/(public)/page.tsx` — branded landing page, pulls `consultant_profiles` filtered by `is_accepting_new_clients` (schema's `idx_consultant_public_lookup` index exists precisely for this query).
2. Build `apps/web/app/(tenant)/[slug]/(public)/book/page.tsx` — bio, fee, languages, rating (`rating_avg`/`rating_count`), embedded slot picker.
3. Build `apps/api`'s `appointments.router.ts` read endpoint for OPEN slots, respecting `booking_cutoff_hours` from `tenant_settings`.

### Sprint 3.2: Booking Transaction & Conflict Prevention

1. Implement `booking.service.ts` in `apps/api`: creates or reuses a `case` for the client/consultant/category triple (PRD §1.3 note — a pair can have more than one concurrent case if `matter_key` differs), then creates the `appointment` inside a single DB transaction that also flips the `availability_slots.status` to `BOOKED`.
2. Enforce double-booking prevention using the slot's `version` column (optimistic lock) inside that transaction.
3. Client-side dependent/family profile selector on the booking form (books on behalf of a linked `guardian_links` profile).

### Sprint 3.3: Recurring Series & Out-of-Office Enforcement

1. Implement `appointment_series` creation: one API call expands a `recurrence_rule` into individual `appointments`, each carrying `series_id` (schema §3.12).
2. Booking-flow UI: "book a recurring series" option on `/book`.
3. Enforce `out_of_office_periods` at booking time: reject/auto-reply for slots inside an active OOO window with `pauses_new_bookings = true`.
4. Waitlist: when a client cancels a booked slot, notify a waitlist for that slot instead of leaving it open silently (implementation detail — a lightweight in-memory/DB queue keyed by slot, not a new schema table unless usage data later justifies one).

### Sprint 3.4: Appointment Lifecycle & Queue Management

1. Implement the two-stage state transitions on `appointments.status` (schema's `appointment_status` enum): `TENANT_ADMIN` Admin-Approve / Propose-Reschedule / Reject-with-reason on a `REQUESTED` appointment (checking the Consultant's availability), then `CONSULTANT` Accept / Reject-with-reason on the resulting `ADMIN_APPROVED` appointment, plus `CONSULTANT` Cancel/Complete/No-Show on an `APPROVED` one.
2. Build `apps/web/(tenant)/[slug]/(admin)/appointments/page.tsx` (Tenant Admin's incoming request queue — first review stage), `apps/web/app/(tenant)/[slug]/tenant/(consultant)/consultant/appointments/page.tsx` (Consultant's queue of admin-approved requests), and the equivalent `apps/web/app/(platform)/(client)/client/appointments/page.tsx` (accept/decline a Tenant-Admin-proposed reschedule, cancel within cutoff).
3. Build series-level actions: admin-approve/consultant-approve/manage a whole `appointment_series` in one action rather than per-occurrence, following the same two-stage gate.
4. `apps/api/src/cron/`: auto-expire unresolved `REQUESTED` appointments (awaiting Tenant Admin review) after a configurable window (tenant-level setting, default e.g. 24h)

Use a database cron for this sprint.

---

## Phase 4: Session Logging & Case Timeline (Weeks 14–18)

**Goal**: The core value proposition — everything a Consultant needs to log a session, track commitments/tasks, manage documents, and give a Client a readable timeline. This phase is the largest because it's the reason the product exists.

### Sprint 4.1: Case Lifecycle & Ad-Hoc/Session Interaction Logging

1. Make sure each `cases` schema is the point of contact for `interactions`, `commitments`, `tasks`, `clients`, `supporting docs`, `appointments`
2. Each `case` should be linked to `appointments`
3. Build `cases.router.ts`: case status transitions (`ACTIVE`/`CLOSED`), tag CRUD (`cases.tags[]`, consultant-private CRM segmentation, schema §3.11).
4. Build `interactions.router.ts`: create a `SESSION_NOTE` tied to an `appointment_id`, or an `AD_HOC_NOTE`/`CALL_LOG`/`MESSAGE_LOG` with no appointment link, for logging a thought between sessions.
5. Build the "quick-capture" floating widget in `apps/web` (available from anywhere in the consultant dashboard, not just inside a session) which shows cases inorder to store the transcript in a correct session.
6. Implement the `is_client_visible` toggle at write time — defaults to `false` (private) for every interaction type.
7. Implement soft-delete (`deleted_at`) with a 30-day recovery window, per schema §5 retention policy — no hard delete from the API directly.

### Sprint 4.2: In-Browser Recording & Async Whisper Transcription

1. Build the "Start Session" recording UI (`apps/web/.../sessions/[appointmentId]/page.tsx`) using the browser's `MediaRecorder` API.
2. Upload the resulting audio directly to a Supabase Storage bucket path prefixed `{tenantId}/{caseId}/...`.
3. `apps/api`'s `integrations/whisper.ts` dispatches the stored file to the Hugging Face Whisper endpoint and sets `interactions.transcription_status = PROCESSING`.
4. `apps/api/src/webhooks/transcription.webhook.ts` receives the async callback, writes the transcript into `interactions.notes`, and sets `transcription_status = COMPLETE` (or `FAILED` with a manual-retry path).
5. Manual transcript-edit UI for a Consultant to correct transcription errors.
6. Use the `microservices/workers.js` pipeline for audio transcription

### Sprint 4.3: Document Storage, Versioning & Visibility

1. Build `documents.router.ts`: upload issues a Supabase Storage signed URL scoped to the `{tenantId}/{caseId}/...` prefix (never a raw bucket credential, per `docs/schema.md` 1.2/3.16).
2. Implement append-only versioning via `previous_version_id` self-reference — never overwrite a row.
3. Implement the `is_client_visible` toggle at upload time, defaulting to private; require an explicit "Share with Client" action to flip it.
4. Mobile camera capture flow for a Client uploading a prescription/report photo.

### Sprint 4.4: Commitments & Tasks

1. Build `commitments.router.ts` and `tasks.router.ts`/`task_reminders.router.ts`, with `assigned_to` distinguishing Consultant to-dos from Client to-dos (schema §3.15).
2. `apps/api/src/cron/`: sweep `tasks` past `due_at` and flag `OVERDUE`; sweep `task_reminders` where `sent_at IS NULL` and dispatch via the notification service (built in Phase 5, so this job can be stubbed to a log line until then).

### Sprint 4.5: Chronological Case Timeline

1. Build `apps/web/app/(tenant)/[slug]/tenant/(consultant)/consultant/cases/[id]/page.tsx`: unify `appointments`, `interactions`, `commitments`, `tasks`, `documents` into one filterable, searchable, paginated feed,
2. Add quick-capture and click-to-call/WhatsApp actions directly from the case page.
3. Add the "Refer to colleague" action opening the cross-consultant referral flow (data model exists from Phase 0; full referral UI ships in Phase 6 — this sprint only wires the entry point).
4. Client-facing read-only timeline (`(client)/cases/[caseId]/page.tsx`) with a PDF/timeline export button.

**Validate** :

1. Test by adding a case, interaction, commitmnet, task, doc
2. Book an appointment by existing client where consultant can recognize the client and his case automatically
3. Book an appointment by new client where consultant has to create a new case and add the client for later follow-ups.

---

## Phase 5: Notifications, Reminders & Everyday-Life Features (Weeks 19–20)

**Goal**: Everything logged and scheduled in Phases 3–4 actually reaches the right person, on the right channel, on time.

### Sprint 5.1: Notification Preferences & Dispatch

1. Build `notification-preferences.router.ts`: per-user opt-in/channel/lead-time config (schema §3.22).
2. Build `apps/api/src/integrations/twilio.ts` (SMS/WhatsApp) and `resend.ts` (email); a single `dispatch()` entry point that reads `notification_preferences` before sending on any channel.
3. Build `apps/web/(*)/notifications/page.tsx` — per-user preferences UI.
4. Wire the notification types already required by earlier phases: `APPOINTMENT_REMINDER`, `TASK_DUE`, `SESSION_JOINING_SOON` (~10 min before an appointment, surfacing the video link).
5. I need the following notifications to be enabled
   - Appointment reminder email + sms + whatsapp to client and Consultant
   - Task reminder email + sms + whatsapp to client
   - Session joining soon email + sms + whatsapp to client and Consultant
   - Session reminder email + sms + whatsapp to client and Consultant
   - Task due email + sms + whatsapp to client and Consultant
   - Commitments reminder email + sms + whatsapp to Consultant
   - Consultant onbboarded email + sms + whatsapp to Tenant + Consultants in that tenant

### Sprint 5.2: Cron Jobs & Digest

1. `apps/api/src/cron/end-of-day-digest.ts`: sessions completed, commitments/tasks created today, anything still open — sent per the user's notification preferences.
2. `apps/api/src/cron/reminders.ts`: due-soon tasks, join-soon appointments, and out-of-office auto-replies (checks `out_of_office_periods` and fires `auto_reply_message` to affected client messages).
3. Calendar sync: outbound `.ics` feed keyed by `consultant_profiles.calendar_sync_token` (schema §3.8) — unauthenticated but unguessable, per the design note.
4. Offline-safe note drafts: local-storage buffering in `apps/web` for interaction notes typed during a network drop, synced on reconnect.

---

## Phase 6: Growth & Analytics (Weeks 21–22)

**Goal**: Features that only make sense once there's a live client base and booking history to analyze.

### Sprint 6.1: Referrals

1. Build `referrals.router.ts`: client-invite-a-client flow — generate/share `client_profiles.referral_code`, track `referred_client_id`/`reward_status` (schema §3.21).
2. Build `apps/web/(consultant)/referral-program/page.tsx` (configure reward type) and `(client)/refer/page.tsx` (get/share code, see rewards).
3. Build `consultant-referrals.router.ts`: complete the cross-consultant hand-off flow whose entry point was wired in Phase 4 — accept auto-creates a new `case` seeded with `context_note`; decline just closes the request.
4. Build `apps/web/(consultant)/referrals/page.tsx` — incoming/outgoing queue.

### Sprint 6.2: Analytics Snapshot, Burnout Indicator & Smart Slot Suggestions

1. `apps/api/src/services/analytics.service.ts` + `apps/api/src/cron/analytics-snapshot.ts`: nightly job computing `booked_hours`, `overdue_commitment_count`, `cancellation_rate`, `repeat_booking_rate` into `consultant_analytics_snapshot` (schema §3.20) — dashboards read this cache, never raw history live.
2. Build the burnout-indicator card on `apps/web/(consultant)/dashboard/page.tsx` — soft warning sourced from the snapshot.
3. Build smart-slot-suggestions on `apps/web/(consultant)/availability/page.tsx` — highlight historically high-cancellation time slots.
4. Build `apps/web/(consultant)/analytics/page.tsx` — repeat-booking rate, average fee realized, busiest-hours heatmap.

---

## Phase 7: Payments (Weeks 23–24)

**Goal**: Clients can pay for bookings; Consultants can see what they're owed.

### Sprint 7.1: Define the Payments Table & Razorpay Checkout

1. **Resolve an open gap before writing any code**: `schema_ayushman_v3.md`'s own ERD (§1) shows `appointments ──► payments`, but no `payments` table is actually defined in §3. Add it now, as its own migration in `packages/db` — minimally: `id`, `tenant_id`, `appointment_id` (or `appointment_series_id` for series pay-upfront), `client_id`, `amount`, `currency`, `status` (`PENDING`/`CAPTURED`/`FAILED`/`REFUNDED`), `razorpay_order_id`, `razorpay_payment_id`, `payment_timing` (`PAY_ON_BOOKING`/`PAY_AFTER_SESSION`), `created_at`. Apply the standard tenant-isolation RLS policy (schema §4.1) to it like every other tenant-scoped table.
2. Build `payments.router.ts` checkout endpoint: creates a Razorpay order, respecting the tenant's/consultant's `payment_timing` preference, and handles paying for a whole `appointment_series` upfront vs. per-occurrence.
3. Build the checkout UI on the booking flow (`(public)/book` → payment step) with refund-policy display before confirmation.

### Sprint 7.2: Webhook, Payouts & Invoicing

1. Build `apps/api/src/webhooks/razorpay.webhook.ts`: signature-verified handler updating `payments.status`.
2. Scheduled job to reconcile any webhook drift (a `payments` row stuck `PENDING` past a threshold gets re-checked against Razorpay's API).
3. Build the Consultant payout ledger (`apps/web/(consultant)/payouts/page.tsx`): gross fee minus `tenant_billing.platform_commission_pct`, payout account setup.
4. Automatic invoice/receipt PDF generation, downloadable from `(client)/payments/page.tsx`.

---

## Phase 8: AI Assistant (RAG) (Weeks 25–26)

**Goal**: Case-scoped AI chat and session-recap generation, hard-isolated per tenant and case at the code layer — never left to prompt instructions (PRD §1.2).

### Sprint 8.1: Retrieval Service & Pinecone Namespacing

1. Build `apps/api/src/services/rag.service.ts` — the **only** place a Pinecone query is issued; every call requires both `tenantId` and `caseId`, enforced in code before the query is built.
2. Provision one Pinecone namespace per tenant (or, at minimum, a mandatory metadata filter on `tenantId` **and** `caseId` on every query).
3. Indexing pipeline: `interactions`/`documents` content is embedded and upserted on write, tagged with `tenant_id`/`case_id`/`interaction_id`/`document_id` metadata so `rag_citations` (schema §3.17) can resolve back to a real row.

### Sprint 8.2: Case-Scoped Chat, Session Recap & Citations

1. Build `ai.router.ts`: chat endpoint writing to `chat_messages`, "generate session recap" endpoint writing to `ai_summaries` with `is_client_visible` defaulting to `false`.
2. Build `apps/web/(consultant)/clients/[caseId]/ai/page.tsx` — chat panel with citation links back to the source `interaction`/`document`, thumbs up/down feedback stored on `chat_messages.feedback`.
3. Build `apps/web/(client)/cases/[caseId]/ai-summary/page.tsx` — read-only view of Consultant-shared summaries only, never a query interface into private notes.
4. Build `(public)/help/page.tsx` — a separate, rule-based (non-RAG, non-case-scoped) FAQ chat for booking/payment questions.

---

## Phase 9: Reviews, Grievances & Oversight (Weeks 27–28)

**Goal**: Post-session feedback, and the platform-level grievance channel that deliberately bypasses the tenant it's about.

### Sprint 9.1: Reviews

1. Build `reviews.router.ts`: one review per `appointment_id`, `rating` (1–5) mandatory, `nps_score` (0–10) optional (schema §3.18).
2. Build the one-tap post-session review UI (`(client)/appointments/[id]/review/page.tsx`).
3. Add the `AFTER INSERT` trigger recomputing `consultant_profiles.rating_avg`/`rating_count` directly in the database (schema §3.18 note) — never computed in application code, so the cache can't drift.

### Sprint 9.2: Grievance System

1. Build `grievances.router.ts` with its own auth branch, matching schema §4.3 exactly: Client submit/view-own only, Super Admin sees and triages everything globally — **no** Tenant Admin route exists on this resource, on purpose.
2. Build the persistent "Report a concern" entry point in the `(client)` layout, present on every tenant subdomain uniformly (not tenant-configurable, not hideable).
3. Build `apps/web/(platform)/grievances/page.tsx` (global inbox, filter by tenant/category/severity/status) and `[grievanceId]/page.tsx` (detail, resolve/dismiss).
4. Wire `GRIEVANCE_SUBMITTED` (to Super Admin, SMS too if `severity = CRITICAL`) and `GRIEVANCE_STATUS_CHANGED` (to the submitting Client only) through the Phase 5 notification dispatcher.
5. Out-of-band channel (fixed support email) for a grievance about the platform/Super Admin itself.

### Sprint 9.3: Tenant Admin Escalation & Audit Log

1. Build the `tenant_admin_view_case()` `SECURITY DEFINER` call path end-to-end (function exists from Phase 0): Tenant Admin dispute-mediation UI (`(admin)/disputes/page.tsx`) requires a non-empty reason before a private case becomes viewable, and that view writes to `audit_logs` every time.
2. Build `audit-log.router.ts` + `(platform)/audit-log/page.tsx` (global) and `(admin)/audit-log/page.tsx` (tenant-scoped, own escalations only).
3. Confirm every Super Admin cross-tenant read anywhere in the app is routed through the shared `audit.service.ts` logger (schema §1.2 — "unrestricted ≠ invisible").

---

## Phase 10: Consultant Verification & Polish (Weeks 29–30)

**Goal**: Everything deliberately deferred because nothing else in the system depends on it, plus final UX polish.

### Sprint 10.1: Consultant Verification Documents

1. Build `verification-documents.router.ts` against `consultant_verification_documents` (schema §3.25 — the last table in the migration order, on purpose: a Consultant is fully bookable and operating end-to-end without ever uploading a document here).
2. Build `apps/web/(consultant)/verification/page.tsx` as its **own** route, separate from `onboarding/page.tsx` — self-attested upload (license/ID/qualification PDF per category), display-only badges on the public `/book` profile, no platform review queue.
3. Direct-to-storage upload via Supabase Storage signed URLs, prefixed `{tenantId}/{consultantId}/...`.

### Sprint 10.2: Personal Settings & Remaining Everyday-Life Features

1. Build `(*)/profile/settings/page.tsx`: language, dark mode, keyboard-shortcut reference.
2. Keyboard-first session logging shortcuts (start/stop recording, save note, log a commitment/task without leaving the keyboard).
3. Personal scratchpad — private, never-shared, never-RAG-indexed space per Consultant (a simple per-consultant note, explicitly excluded from the Phase 8 indexing pipeline).
4. Client search/pinning and bulk-message-by-tag on `(consultant)/clients/page.tsx`, if not already covered incidentally during Phase 4.

---

## Phase 11: Security, Compliance & Performance Hardening (Weeks 31–33)

**Goal**: Verify every isolation and access-control claim made in the PRD/schema actually holds under test, then harden for production load.

### Sprint 11.1: RLS & Permission Matrix Audit

1. Full pass over every RLS policy against the PRD §1.4 permission matrix, row by row — confirm no table has an unintended standing grant (especially `grievances` and private `interactions.notes`).
2. Expand `apps/api/tests/integration/rls-policies.test.ts` into full coverage: every role × every tenant-scoped table × cross-tenant negative test.
3. Verify the Pinecone retrieval service (Phase 8) rejects any query missing `tenantId` or `caseId` — no code path should be able to construct one without both.

### Sprint 11.2: Security Hardening

1. Rate limiting on `apps/api` (per-tenant and per-user), especially the grievance-submission and OTP-adjacent endpoints.
2. Column-level encryption (`pgcrypto`) for sensitive fields flagged as encrypted-in-production in the schema (e.g. any stored payout account details once Phase 7's `payments`/payout schema is finalized).
3. Sentry (or equivalent) wired into both `apps/web` and `apps/api`.
4. Confirm the Auth Hook and tenant-context middleware are the only two places a `tenant_id`/`is_super_admin` claim is ever trusted — audit for any stray code path reading a client-supplied header instead.

### Sprint 11.3: Accessibility & Load Testing

1. WCAG 2.1 AA pass across `apps/web` — screen-reader compatibility, keyboard navigation (dovetails with Sprint 10.2's shortcuts work).
2. Load test the booking-transaction path (Sprint 3.2) specifically for the double-booking race condition under concurrent load.
3. Load test the RAG chat path (Phase 8) and the transcription webhook (Sprint 4.2) for their async failure/retry behavior.

---

## Phase 12: Scaling & Launch Readiness (Weeks 34–36)

**Goal**: Deployment, database, and infrastructure tuning for production traffic across two independently deployable apps.

1. Database connection pooling (PgBouncer or Supabase's pooler) — `apps/api` is now the sole DB client, so pooling only needs to be tuned in one place.
2. Read-replica configuration to offload case-timeline read traffic (the heaviest read path, per schema §3's timeline-feed index design).
3. CDN caching rules for the public `/book` pages and static assets.
4. Confirm `apps/web` and `apps/api` deploy and scale independently (per PRD §7.1's stated reason for the split) — separate deploy pipelines, separate scaling policies.
5. Database indexing review against real query patterns from Phase 11 load testing, focused on `cases`, `interactions`, and `appointments`.
6. Supabase Storage lifecycle rules to archive aged session audio/documents per the schema §5 retention policy.
7. Final end-to-end test pass across the full Phase 0–11 feature set on a staging tenant before go-live.

---

## Phase 13: Post-v1 Backlog (Weeks 37+)

Items explicitly out of scope for this build, carried over from PRD §6's open points and product scope boundaries:

- **Self-serve tenant provisioning** — v3 requires a Super Admin to create every tenant (PRD §6 Open Point #3); a signup-and-provision-instantly flow is a distinct, later feature.
- **Resolving Open Point #1** (Tenant Admin/Consultant same-login) and **Open Point #2** (Client identity spanning tenants) — both are breaking schema changes to `users`, deliberately not pre-built on a guess.
- **Anonymized, aggregate grievance-count view for Tenant Admins** (PRD §4.2) — not built by default, since it risks re-identifying a complainant in a small tenant; would ship as a separate pre-aggregated view, not a relaxed policy on `grievances`.
- **Native iOS/Android companion apps.**
- **Embedded in-app video calling** — currently an external Zoom/Meet link stored on `appointments.video_link`.
- **Additional payment processors / international currencies** beyond Razorpay.
