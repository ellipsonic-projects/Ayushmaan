# Product Requirements Document
## Consultant Context & Client Relationship Platform ("Ayushman") — Multi-Tenant SaaS

**Version:** 0.7 (Draft)
**Owner:** Product
**Status:** Draft for review
**Last updated:** July 3, 2026

---

## 1. Background & Problem Statement

Independent consultants — Medical, Legal, IT, Physiotherapy, Homeopathy, Astrology — manage many client relationships in parallel. Each relationship carries its own history: promises made, advice given, diagnoses or recommendations recorded, and ongoing conversations across multiple sessions.

As a consultant's client base grows, the bottleneck is **not identity** (knowing who a client is) but **context**: what was discussed last time, what was promised, what advice was given and why, and what still needs to happen next.

This context today lives in scattered notepads, WhatsApp threads, memory, and disconnected files.

**Change from v0.1:** the platform is now a **multi-tenant SaaS product**. Each Consultant (practice) is a **tenant**. One shared deployment, shared database, and shared codebase serve every tenant — data isolation is enforced at the data layer, not by spinning up separate infrastructure per consultant.

## 2. Objective

Build a multi-tenant platform where any consultant can sign up, get their own branded practice space, and — for every client relationship within their tenant — get:
1. A **chronological timeline** of everything that happened (appointments, interactions, commitments, tasks, documents).
2. **Capture** of new interactions during/after a session (audio → transcript, notes, files).
3. **Tracking of commitments and tasks** with deadlines and pre-deadline notifications.
4. An **AI assistant (RAG-based)**, hard-scoped to a single client's history within a single tenant.
5. **Client booking and payment**, with full appointment lifecycle management.

**North Star metric:** Time for a consultant to feel "fully briefed" before a session, and the rate of commitments/deadlines met (not missed) per tenant.

**New multi-tenant constraint:** no tenant may ever read, infer, or leak another tenant's data — this must hold even if application code has a bug. Isolation is treated as a security invariant enforced by the database, not a feature of the application.

## 3. Users & Personas

| Persona | Description | Key needs |
|---|---|---|
| **Consultant (Tenant Owner)** | Medical, Legal, IT, Physiotherapy, Homeopathy, or Astrology professional. Signing up creates a new tenant. | Own branded booking page/subdomain; never lose context; manage schedule; get paid; invite staff admins |
| **Client** | Person seeking consultation. A client's platform identity is global (one login), but their **data** (case, timeline, documents) is scoped per tenant they interact with. | Easy booking via tenant's `/book` page, transparency on commitments/advice, document sharing |
| **Org Admin** | Staff invited by a specific Consultant, scoped to that Consultant's tenant only | Delegated ops access within one tenant: calendar, appointment requests, client cases, disputes |
| **Platform Admin** *(new)* | Anthropic-side / platform operator | Tenant provisioning, billing, abuse handling, platform-wide audit — never has default access to clinical/legal case content |

## 4. Scope

### In scope (v1)
- **Multi-tenant architecture**: any number of consultant practices on one shared deployment, isolated via Row-Level Security (RLS)
- Tenant provisioning on consultant sign-up (auto-creates tenant record, subdomain, default settings)
- Consultant & client onboarding and profiles
- Direct booking via each tenant's public `/book` page (still no cross-tenant consultant discovery/search — that remains a v2+ marketplace decision)
- Org Admin invites, scoped to the inviting tenant
- Availability/slot management & booking lifecycle (request → approve/reschedule/reject)
- Session/interaction logging: audio recording → transcription, manual notes, document upload
- Commitments & Tasks with deadlines, linked to a client/case
- Dashboard with upcoming deadlines & notifications
- Per-client timeline aggregating all of the above
- AI chat (RAG) scoped per client **and** per tenant for recap, Q&A, summarization *(implementation deferred to Phase 5 — see `phase_scope_ayush.md`)*
- Payments via Razorpay, routed to the correct tenant's payout account
- Role-based access control, now with a tenant dimension: consultant only sees their own tenant's clients; client only sees their own consultants across whichever tenants they've booked with; Org Admin only sees their assigned tenant
- **In-app secure messaging** between client and consultant, scoped per Case *(added after industry review — see §14)*
- **Two-way calendar sync** (Google Calendar / Outlook) so a consultant's external calendar and platform availability stay consistent *(added after industry review — see §14)*
- **Waitlist management** for fully booked slots, with auto-notify on cancellation *(added after industry review — see §14)*
- **MFA (multi-factor authentication) for all users**, not just OTP-at-login — brought forward to v1 given this is the current baseline for platforms handling medical/legal client data *(added after industry review — see §14)*

### Out of scope (v1, candidates for v2+)
- Multi-consultant clinics (multiple Consultant/tenant-owner identities inside one tenant)
- Cross-tenant consultant marketplace / discovery / search
- Native mobile apps (responsive web only in v1)
- Insurance billing / claims integration
- E-prescriptions with regulatory/legal medical compliance (e-signature, controlled substances)
- Video calling embedded in-platform (external links only — see §11)
- International payment rails beyond Razorpay (multi-currency)
- Group/family sessions as a first-class entity
- Custom domains (own domain per tenant, e.g. `booking.drpatel.com`) — v1 ships wildcard subdomains only; custom domains are a fast-follow (see open questions)
- **Legal conflict-of-interest checking and trust/IOLTA accounting** — flagged as a v2 candidate, not v1. These are heavily regulated, jurisdiction-specific, and closer to a distinct product surface (per dedicated legal practice tools like Clio) than a horizontal feature; building them into v1 would add regulatory surface area disproportionate to one of six consultant categories *(added after industry review — see §14)*
- **Consultant-facing analytics dashboard** (revenue trends, no-show rate, completion rates) beyond the raw metrics already tracked in §11 — candidate for v1.1, not launch-blocking *(added after industry review — see §14)*
- **Recurring/package appointments** (e.g., "buy 5 sessions") — common in therapy/wellness platforms, deferred to v2 pending demand signal *(added after industry review — see §14)*

## 5. Core Workflow (v1)

1. **Tenant provisioning** — a consultant signs up, chooses a subdomain (e.g. `drpatel`), and a tenant record is created. All subsequent data for that practice is tagged to this tenant.
2. **Client onboarding** — client signs up (platform-wide identity), fills profile, and lands in the context of the tenant they arrived through (e.g. `drpatel.yourplatform.com/book`).
3. **Book appointment** — client selects an open slot from that tenant's published availability.
4. **Consultant responds** — Approve / Reschedule / Reject. Client notified at each step, via tenant-branded notification templates.
5. **Session happens** — audio recorded → transcribed, notes typed, documents uploaded, commitments and tasks logged — all written with the acting consultant's `tenantId`.
6. **Case/timeline updates** — every interaction, commitment, task, and document attaches to the Client–Consultant Case and appears on a shared chronological timeline, queryable only within that tenant.
7. **AI assistant** — consultant asks: "What did I promise this client last time?" RAG retrieval is filtered by both `caseId` and `tenantId` at the query layer.
8. **Deadlines & notifications** — dashboard surfaces upcoming/overdue items; notifications sent under the tenant's sender identity (e.g. "Dr. Patel's Practice" not "Ayushman").
9. **Payment** — Razorpay fee collection, settled to the correct tenant's payout account.

## 6. Multi-Tenancy Architecture

### 6.1 Isolation strategy
**Shared database, shared schema, Row-Level Security (RLS).** This is the correct default at this stage: cheapest to run, simplest to migrate, and Postgres/Supabase RLS supports it natively.

- Every tenant-scoped table carries a `tenantId` column (`tenantId = consultantId`, i.e. the tenant **is** the consultant's practice).
- RLS policies filter on a `tenant_id` claim embedded in the Supabase Auth JWT — **not** on application-level `WHERE` clauses. This is the same principle Edge Case #28 already required for RAG ("hard-scoped at the query layer... not just prompt-level instruction"); v2 of this PRD extends that principle to **every** table, not just retrieval.
- Prisma remains the ORM. It is wrapped in a **Prisma Client Extension** that automatically injects `tenantId` into every read/write. This means a missed `WHERE tenantId = ...` in application code still can't leak data — RLS is the hard backstop, the Prisma extension is the first line of defense. Belt and suspenders, not either/or.
- A synthetic `platform` tenant (or a separate `is_platform_admin` claim) is used for Platform Admin's cross-tenant operational access — never a bypass of RLS by default, only via an explicitly logged elevated-access path (extends Edge Case #41's justified-access pattern from Org Admin to Platform Admin too).
- **Connection pooling for serverless `NEW`:** Vercel Functions are short-lived and invoked concurrently at scale, which would otherwise open one new Postgres connection per invocation and exhaust Supabase's connection limit quickly. Prisma connects through Supabase's pooled connection string (Supavisor, transaction mode) for all request-path queries, reserving the direct/non-pooled connection string only for migrations. See §15 for the full Vercel-specific checklist.

### 6.2 Frontend: tenant routing
- Next.js stays. Wildcard subdomains (`drpatel.yourplatform.com`) are resolved in the routing layer that maps the subdomain to a `tenantId` and injects it into the request context for that render.
- **Runtime note `NEW`:** as of Next.js 16, this file (`middleware.ts`, renamed `proxy.ts`) runs on the **Node.js runtime by default**, not the Edge runtime. This matters here specifically: it means tenant resolution can query Postgres directly through the normal Prisma client (with RLS) rather than requiring an edge-compatible HTTP driver (e.g. Neon/PlanetScale serverless drivers) or a rewrite around Prisma Accelerate. If the project pins an older Next.js version or explicitly opts into `runtime = "edge"` for this file, that compatibility gap reopens and must be re-evaluated.
- Even on the Node.js runtime, resolving `subdomain → tenantId` on every request by hitting Postgres adds latency to every page load. Cache this mapping (Vercel Edge Config or Upstash Redis, tenant-count is small relative to request volume) with a short TTL, falling back to the DB on cache miss — this is a performance optimization, not a security boundary; RLS still re-validates on every actual data query.
- **Plan requirement `NEW`:** wildcard subdomains on Vercel require a **Pro or Enterprise** team plan — the Hobby plan does not support them. This should be confirmed as an accepted infrastructure cost before build starts, not discovered at deploy time.
- Custom domain support (tenant brings their own domain) is a v1.1 fast-follow, not a v1 blocker — see open questions.

### 6.3 Auth
- Supabase Auth remains the identity provider (email/phone OTP, password, optional social login).
- **Custom JWT claims** are injected at token issuance via a Supabase Auth Hook, embedding `tenantId` (for Consultant/Org Admin sessions) and a `role` claim. RLS policies read directly off these claims.
- A Client's JWT does **not** carry a single fixed `tenantId` — clients can belong to multiple tenants (multiple consultants). Instead, Client-side queries are scoped by an explicit `caseId`/`tenantId` parameter validated against a `ClientTenantMembership` join, checked by RLS on every request (see §6.5, open question 2, for the exact membership model to confirm).
- Org Admin invites are tenant-scoped roles (`role = ORG_ADMIN`, `tenantId = <inviting consultant's tenant>`) — an Org Admin for one tenant has zero visibility into any other tenant, enforced by the same JWT-claim RLS.
- **MFA is required for all users, not just Consultant/Org Admin `NEW`**: brought forward from an earlier "optional" posture to a v1 requirement — this platform holds medical and legal client data, and MFA-for-all is now the baseline expectation for that category of product, independent of any single jurisdiction's mandate. Supabase Auth's built-in MFA (TOTP; SMS via Twilio as a fallback factor) is used rather than a custom implementation.

### 6.4 Background jobs
Transcription and notification jobs multiplying across many concurrent tenants is the piece that most needs upgrading from a single-tenant design.

- Replace ad hoc Supabase Edge Functions with a real job queue: **Trigger.dev** *(decided — see §13.1 `NEW`)*. All async work — transcription, AI summarization, notification dispatch, reconciliation, calendar sync — runs through Trigger.dev tasks, tagged with `tenantId`.
- **Why this is required, not optional, on Vercel:** Vercel Functions have a hard execution ceiling — low single-digit seconds by default on Hobby, extendable to a minute on Pro, and only up to the ~800 second range with explicit per-function configuration on Pro/Enterprise (still in beta for the longer end). A Vercel Function must also terminate — it cannot run as a persistent background worker. A Vercel API route or Server Action must therefore only **enqueue** a job (fast, well within limits on any plan) and return immediately; the actual transcription/summarization/sync work executes on Trigger.dev's own compute, which is designed for long-running and durable execution (no execution time limit on tasks), not on Vercel's request/response path.
- **Free-tier compatibility `NEW`:** this split is specifically what keeps the project deployable on **Vercel's free Hobby plan**. Trigger.dev has its own free tier (10,000 task runs/month) and runs entirely on its own infrastructure — a Vercel Function on Hobby never needs to do more than call `trigger.dev`'s SDK to enqueue a task, which finishes in well under Hobby's function limits. Trigger.dev also ships a first-party Vercel integration (auto-deploys tasks on every `git push`, syncs environment variables both directions) so this isn't a bolted-on second CI/CD pipeline. **Note:** wildcard subdomains (§6.2) still require Vercel Pro/Enterprise independently of this choice — that constraint doesn't go away, but the background-job architecture itself no longer forces a paid Vercel plan.
- **Per-tenant rate limiting** via **Upstash Redis**, so one high-volume tenant's transcription backlog cannot starve another tenant's dashboard or notification delivery. Queue concurrency is capped per `tenantId`, not just globally.

### 6.5 Notifications
- Twilio (SMS) + Resend (email) + in-app remain the channels.
- Sender identity and templates become **tenant-aware**: a client sees "Dr. Patel's Practice" as the sender, with the tenant's display name/logo in email templates, not "Ayushman" or the platform's own branding. Template variables are pulled from `TenantSettings` (new entity, §7.2).
- **Real-time delivery `NEW`:** in-app notifications and the new Message thread (§7.20) need live updates in the client UI (unread badges, new-message indicators) without the person refreshing the page. Vercel Functions cannot hold an open WebSocket connection to push these updates. Use **Supabase Realtime** (Postgres change-data-capture over WebSockets, hosted by Supabase, not Vercel) for this — the client subscribes directly to Supabase, and Vercel's role stays request/response only.

### 6.6 Storage
- Supabase Storage (S3-compatible) remains the store for audio and documents.
- Bucket paths are namespaced by tenant: `s3://.../{tenantId}/{caseId}/{documentId}` — this is a defense-in-depth measure alongside signed-URL access control and RLS-gated metadata rows; it is not itself the isolation mechanism.
- **Upload path `NEW`:** Vercel Functions cap request bodies at 4.5MB, which audio recordings and many documents (Edge Case #14: >1 hour recordings) will exceed immediately. Uploads never proxy through a Vercel Function. The browser requests a short-lived signed upload URL from a Vercel Function (small JSON request/response, well under the limit), then uploads the file **directly** to Supabase Storage. The Vercel Function is only in the path for authorization (checking the case/tenant) and for writing the resulting `Document`/`Interaction` metadata row once the client confirms the upload completed.

### 6.7 Vector store (RAG)
- Pinecone remains the vector DB. Each vector's metadata includes both `caseId` and `tenantId`; every query filters on both, matching the DB-level RLS principle at the retrieval layer (Edge Case #28, now applied at tenant granularity as well as case granularity).

## 7. Entities & Attributes (Data Model)

> Designed to map to Prisma schemas / PostgreSQL (Supabase), with RLS policies keyed on `tenantId`. IDs are UUIDs unless noted. Timestamps `createdAt`/`updatedAt` implied on all entities. **New/changed fields from v0.1 are marked `NEW`.**

### 7.1 Tenant `NEW`
- `id`, `subdomain` (unique, e.g. `drpatel`), `customDomain` (nullable, v1.1), `displayName`, `logoUrl`, `brandColor`, `ownerConsultantId` (FK → ConsultantProfile), `status` (`ACTIVE`|`SUSPENDED`|`TRIAL`), `plan` (subscription tier — see open questions), `createdAt`

### 7.2 TenantSettings `NEW`
- `id`, `tenantId` (FK), `notificationSenderName`, `notificationReplyToEmail`, `smsSenderId`, `defaultAppointmentBufferMins`, `autoApproveBookings` (bool), `cancellationCutoffHours`, `payoutAccountId`

### 7.3 User (base auth identity)
- `id`, `email`, `phone`, `passwordHash` / authProviderId, `role` (`CLIENT`|`CONSULTANT`|`ORG_ADMIN`|`PLATFORM_ADMIN`), `isVerified`, `isActive`, `lastLoginAt`
- *Note:* `User` is **not** tenant-scoped — identity is global, consistent with §6.3.

### 7.4 ClientTenantMembership `NEW`
- `id`, `clientUserId` (FK), `tenantId` (FK), `firstInteractionAt`, `status` (`ACTIVE`|`ARCHIVED`)
- *Rationale:* makes explicit which tenants a given client has an active relationship with; RLS on Case/Interaction/etc. checks membership through this join, not just a client ID.

### 7.5 ClientProfile
- `id`, `userId` (FK), `fullName`, `dob`, `gender`, `address`, `emergencyContact`, `preferredLanguage`, `timezone`, `profilePhotoUrl`, `kycStatus`, `guardianInfo` (nullable, for minors)
- *Note:* profile itself is global; category-specific fields (e.g. medical history) still render conditionally per which tenant's category the client is engaging with, per FR4.

### 7.6 ConsultantProfile
- `id`, `userId` (FK), **`tenantId` (FK) `NEW`**, `fullName`, `category`, `subSpecialization`, `bio`, `qualifications[]`, `licenseNumber`, `licenseDocUrl`, `isVerified`, `yearsOfExperience`, `consultationFee`, `currency`, `languagesSpoken[]`, `timezone`, `ratingAvg`, `ratingCount`, `payoutAccountDetails`, `isAcceptingNewClients`

### 7.7 Availability / Slot
- `id`, **`tenantId` (FK) `NEW`**, `consultantId` (FK), `dayOfWeek`/`specificDate`, `startTime`, `endTime`, `slotDurationMins`, `isRecurring`, `bufferBeforeMins`, `bufferAfterMins`, `status`, `maxBookingsPerSlot`

### 7.8 Case
- `id`, **`tenantId` (FK) `NEW`**, `clientId` (FK), `consultantId` (FK), `category`, `status`, `openedAt`, `closedAt`, `closureReason`, `tags[]`

### 7.9 Appointment
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `clientId`, `consultantId`, `slotId`, `scheduledStart`, `scheduledEnd`, `status`, `rejectionReason`, `rescheduleReason`, `rescheduleProposedBy`, `mode`, `meetingLink`, `feeAmount`, `paymentStatus`

### 7.10 Interaction
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `appointmentId` (nullable FK), `consultantId`, `type`, `occurredAt`, `rawAudioUrl` (S3, tenant-namespaced path), `transcriptText`, `transcriptStatus`, `transcriptLanguage`, `notesText`, `durationSeconds`, `consentGiven`, `visibility`

### 7.11 Commitment
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `interactionId` (nullable FK), `madeBy`, `description`, `dueDate`, `status`, `fulfilledAt`, `priority`

### 7.12 Task
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `interactionId` (nullable FK), `assignedTo`, `title`, `description`, `dueDate`, `status`, `completedAt`, `reminderSentAt[]`

### 7.13 Document
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `interactionId` (nullable FK), `uploadedBy`, `fileUrl` (S3, `{tenantId}/{caseId}/...` path), `fileType`, `fileSizeBytes`, `fileName`, `category`, `version`, `previousVersionId`, `scanStatus`, `accessLevel`

### 7.14 AISummary
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `generatedAt`, `summaryType`, `inputInteractionIds[]`, `outputText`, `modelUsed`, `sourceCitations[]`, `consultantFeedback`, `wasEdited`

### 7.15 ChatMessage
- `id`, **`tenantId` (FK) `NEW`**, `caseId` (FK), `userId`, `role`, `content`, `retrievedSourceIds[]`, `createdAt`

### 7.16 Notification
- `id`, **`tenantId` (FK, nullable for platform-level notices) `NEW`**, `userId` (FK, recipient), `type`, `relatedEntityType`, `relatedEntityId`, `channel`, `status`, `scheduledFor`, `sentAt`

### 7.17 Payment / Transaction
- `id`, **`tenantId` (FK) `NEW`**, `appointmentId` (FK), `clientId`, `consultantId`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `currency`, `status`, `refundAmount`, `refundReason`, `platformFee`, `consultantPayoutAmount`, `payoutStatus`

### 7.18 Review
- `id`, **`tenantId` (FK) `NEW`**, `appointmentId` (FK), `clientId`, `consultantId`, `rating`, `comment`, `isVisible`

### 7.19 AuditLog
- `id`, **`tenantId` (FK, nullable for platform-admin actions) `NEW`**, `actorUserId`, `action`, `entityType`, `entityId`, `ipAddress`, `timestamp`, `metadata` (JSON)

### 7.20 Message `NEW`
- `id`, `tenantId` (FK), `caseId` (FK), `senderUserId` (FK), `senderRole` (`CLIENT`|`CONSULTANT`|`ORG_ADMIN`), `content`, `readAt` (nullable), `attachmentDocumentId` (nullable FK → Document), `createdAt`
- *Rationale:* a plain async message thread per Case, distinct from `ChatMessage` (which is the AI assistant conversation log). Separating these keeps RAG retrieval clean — human-to-human messages are a source Interaction can reference, not something the AI assistant participates in by default.

### 7.21 CalendarSync `NEW`
- `id`, `tenantId` (FK), `consultantId` (FK), `provider` (`GOOGLE`|`OUTLOOK`), `externalCalendarId`, `accessTokenEncrypted`, `refreshTokenEncrypted`, `syncDirection` (`READ_ONLY_BUSY_BLOCKS`|`TWO_WAY`), `lastSyncedAt`, `syncStatus` (`CONNECTED`|`ERROR`|`DISCONNECTED`), `errorMessage` (nullable)
- *Rationale:* stores the OAuth grant and sync state per consultant; `Availability`/`Slot` records generated from external busy blocks are tagged with a `sourceCalendarSyncId` so they can be reconciled/removed if the external event changes.

### 7.22 WaitlistEntry `NEW`
- `id`, `tenantId` (FK), `consultantId` (FK), `clientId` (FK), `desiredDateRangeStart`, `desiredDateRangeEnd`, `preferredSlotIds[]` (nullable), `status` (`WAITING`|`OFFERED`|`CONVERTED`|`EXPIRED`|`CANCELLED`), `offeredSlotId` (nullable), `offerExpiresAt` (nullable), `createdAt`

---

## 8. Functional Requirements

### 8.1 Tenant Provisioning `NEW`
- FR0a: On Consultant sign-up, a `Tenant` and `TenantSettings` record are created transactionally with the `ConsultantProfile`; subdomain availability is checked and reserved atomically.
- FR0b: Subdomain is editable once post-launch with a cooldown, to prevent booking-link churn for existing clients.
- FR0c: Tenant `status` starts `TRIAL`/`ACTIVE` per the billing plan (see open questions); `SUSPENDED` tenants render a maintenance page on their subdomain, and no writes are permitted through RLS.

### 8.2 Onboarding & Profiles
- FR1: Client and Consultant sign up with email/phone + OTP (Supabase Auth) or password; role selected at signup.
- FR2: Consultant selects exactly one primary category at onboarding; sub-specialization is free text or curated per category.
- FR3: Consultant onboarding collects category-specific license/qualification credentials (self-attested, correctly-named PDFs displayed on the tenant's public profile). Profile is active immediately; bookability is controlled by "Accept Bookings" toggle — no platform verification queue, but verification requirements are tiered by category per Edge Case #42.
- FR4: Client profile fields adapt based on which tenant/category they're engaging with — optional/conditional sections, not hard signup requirements.

### 8.3 Direct Booking
- FR5: Clients book via a tenant's public `/book` page (resolved from subdomain in middleware). No cross-tenant consultant search.
- FR6: Consultants define recurring weekly availability plus date-specific overrides, scoped to their tenant.
- FR7: Booking creates an Appointment in `REQUESTED` (or `APPROVED` if auto-approve is on for that tenant).
- FR8: Consultant can Approve / Propose Reschedule / Reject any `REQUESTED` appointment within their tenant.
- FR9: Client can Accept/Decline a proposed reschedule.
- FR10: Both parties can cancel an `APPROVED` appointment up to the tenant's configured cutoff.
- FR10a `NEW`: Consultant can connect a Google or Outlook calendar (OAuth). In `READ_ONLY_BUSY_BLOCKS` mode, external events block matching platform Availability without exposing external event details; in `TWO_WAY` mode, platform Appointments also write a corresponding external calendar event, and cancellations/reschedules on either side propagate within a configurable sync window (target: under 5 minutes).
- FR10b `NEW`: If a slot is fully booked (`maxBookingsPerSlot` reached) or a consultant is not accepting new bookings in the desired window, a client can join a `WaitlistEntry`. When a matching cancellation opens a slot, the platform offers it to the next waiting client(s) in order, with a time-boxed hold (`offerExpiresAt`) before offering to the next person.

### 8.4 Session Logging
- FR11–FR16: unchanged from v0.1, all writes now carry the acting user's `tenantId`, enforced by the Prisma extension + RLS, not just by application logic.

### 8.5 Commitments & Tasks
- FR17–FR22: unchanged from v0.1, tenant-scoped.

### 8.6 Timeline & Case View
- FR21–FR22: unchanged, tenant-scoped.

### 8.6a Secure Messaging `NEW`
- FR22a: Client and Consultant (and Org Admin, if granted case access) can exchange asynchronous text messages scoped to a Case, visible on the Case timeline as a distinct event type.
- FR22b: Messages can carry a single attached Document, subject to the same `accessLevel` and virus-scan rules as any other Document (Edge Case #23).
- FR22c: Message notifications respect per-user notification preferences (FR30) and tenant branding; unread-message count surfaces on the consultant's dashboard.
- FR22d: Messaging is explicitly out of scope for time-sensitive/emergency communication — the UI must state this, consistent with FR27's "not a substitute for professional judgment" disclosure pattern.

### 8.7 AI Assistant (RAG)
- FR23: AI chat retrieval is filtered by **both** `caseId` and `tenantId` at the Pinecone query layer and at the Postgres query layer — never by prompt instruction alone (Edge Case #28, extended to tenant granularity).
- FR24–FR27: unchanged from v0.1.
- FR28: Client-facing shared AI summaries remain configurable per tenant, not platform-wide.

### 8.8 Notifications
- FR29: unchanged event set.
- FR30: Notification preferences are per user; **sender branding is per tenant** (`TenantSettings.notificationSenderName`, etc.) — FR30 extended `NEW`.

### 8.9 Payments
- FR31: Razorpay order/capture flow unchanged; payout routes to `TenantSettings.payoutAccountId`.
- FR32–FR34: unchanged from v0.1, per-tenant payout ledger.

### 8.10 Access Control & Admin
- FR35: Consultant/Org Admin see only their own tenant's Cases/Clients (enforced by RLS on `tenantId` claim). Client sees only Cases/Consultants they hold a `ClientTenantMembership` for.
- FR36: Org Admin invites are tenant-scoped; an Org Admin invited by one Consultant has no access, implicit or explicit, to any other tenant.
- FR37 `NEW`: Platform Admin has no default read access to any tenant's clinical/legal data; cross-tenant access requires an explicit, logged, justified-access grant (extends Edge Case #41 to the platform level), and is itself an `AuditLog` entry.

---

## 9. Non-Functional Requirements
- **Tenant isolation as a security invariant:** enforced primarily by Postgres RLS policies keyed on the JWT `tenant_id` claim; the Prisma Client Extension auto-injecting `tenantId` is a secondary, defense-in-depth layer — **RLS is the source of truth, not the app.**
- **Data sensitivity & compliance:** encrypt data at rest (S3 SSE, Postgres column-level encryption for highly sensitive fields) and in transit (TLS). Audit logs for all access to clinical/legal records, now including cross-tenant Platform Admin access. Plan for India's DPDP Act and HIPAA-equivalent considerations if expanding beyond India.
- **Availability:** booking and dashboard target high uptime per tenant; a single tenant's incident (e.g. runaway transcription job) must not degrade another tenant's experience — enforced via per-tenant rate limiting (Upstash Redis) on the job queue.
- **Performance:** timeline view paginates/lazy-loads for long histories; all list queries are indexed on `(tenantId, ...)` composite keys to keep RLS-filtered queries fast at scale.
- **Scalability:** transcription and AI summarization run as background jobs on Trigger.dev, tagged and rate-limited per tenant, not synchronous request-response.
- **Retention & deletion:** data export and deletion requests supported per tenant and per client, while respecting legal record-retention obligations. Per Open Question 2 (v0.1), files remain in the platform-linked Supabase bucket; deletion uses the anonymize-vs-retain workflow for Medical/Legal conflicts.
- **Auditability:** every access to a client's sensitive record — by Org Admin or Platform Admin — is logged with tenant context.
- **Localization:** multi-language support for transcription and UI.
- **Accessibility `NEW`:** client-facing surfaces (`/book`, client portal, forms) target WCAG 2.1 AA — keyboard navigability, screen-reader-compatible forms, sufficient color contrast. This is treated as a compliance-adjacent requirement given the client base skews toward older demographics in some categories (Astrology/Homeopathy, per Edge Case #20), not just a nice-to-have.
- **Multi-tenant scale target `NEW`:** architecture should comfortably support O(1,000s) of tenants and O(10,000s) of cases on the shared schema before any isolation-strategy re-evaluation (e.g. schema-per-tenant) is warranted — flagged for revisit at that scale, not designed for up front.

---

## 10. Edge Cases

*(Edge cases 1–42 from v0.1 carry forward unchanged in substance, now understood to apply **within** a single tenant unless otherwise noted. New/modified cases below.)*

### Multi-Tenancy `NEW`
43. Two consultants pick the same or confusingly similar subdomain → enforce uniqueness at the DB level with a case-insensitive constraint; reserve a small blocklist of platform-reserved subdomains (`www`, `app`, `api`, `admin`, etc.).
44. A client has active Cases with two different tenants and both send notifications at similar times → notifications must clearly attribute which practice they're from (tenant branding in every notification), so the client isn't confused about which consultant it's referencing.
45. A tenant is suspended (e.g. non-payment, ToS violation) while it has active Appointments and Commitments → clients must be notified their consultant's booking page is unavailable, and existing case data remains readable (not writable) to affected clients per FR39-equivalent, now at tenant level.
46. RLS policy misconfiguration or migration error temporarily removes the `tenantId` filter on a table → this is treated as a P0 security incident, not a bug ticket; requires a pre-launch policy test suite that asserts every tenant-scoped table denies cross-tenant reads, run in CI.
47. Prisma Client Extension fails to inject `tenantId` (e.g. a raw query bypasses the extension) → RLS must independently reject the cross-tenant row; this scenario is exactly why RLS cannot be optional/secondary in practice, only in code layering.
48. A consultant wants to migrate/export their entire tenant's data (e.g. leaving the platform) → export tooling must be scoped correctly by `tenantId` and produce a complete, client-attributable dataset.
49. Background job queue backlog for one tenant (e.g. bulk historical audio upload) → per-tenant concurrency caps (Upstash Redis) prevent this from delaying another tenant's real-time transcription or notification jobs.

### Calendar Sync, Waitlist & Messaging `NEW`
50. Consultant's external calendar OAuth token expires or is revoked → `CalendarSync.syncStatus` flips to `ERROR`, consultant is notified, and existing platform Availability is **not** silently trusted as accurate until reconnected — booking page shows a "may not reflect full availability" notice rather than failing closed or open silently.
51. Two-way sync creates a conflicting edit (e.g. client reschedules in-platform while consultant simultaneously edits the same event in Google Calendar) → last-write-wins is not acceptable for scheduling; the sync job detects the conflict and flags it for manual consultant confirmation rather than auto-resolving.
52. A waitlisted client doesn't respond within the offer window → offer auto-expires, moves to the next client in the queue, and the original client is notified their offer lapsed (not silently dropped).
53. Client sends a message describing an urgent/emergency situation → per FR22d, the UI must not imply real-time monitoring; this is a known limitation to surface clearly, distinct from Commitment/Task due-date tracking which has explicit notification triggers.

---

## 11. Success Metrics

*(v0.1 metrics carry forward, computed both per-tenant and platform-wide.)*
- % of appointments where a consultant generates/views an AI recap before the session.
- Reduction in missed commitments/tasks (rate of `MISSED`/`OVERDUE` over total).
- Average time-to-brief.
- Booking funnel conversion.
- Transcription success rate and turnaround time.
- Payment success rate and refund/dispute rate.
- Consultant (tenant) retention and client repeat-booking rate.
- **New, platform-level:** tenant activation rate (sign-up → first booking received), tenant churn rate, cross-tenant isolation test pass rate (target: 100%, tracked as a release gate, not just a metric).

## 12. Open Questions

*(v0.1 questions 1, 3, 4, 5 are resolved as stated in v0.1 and carry forward unchanged. Question 2 resolution carries forward. New questions below need your decision before implementation:)*

1. **Billing model for tenants:** is this platform monetized via a per-tenant SaaS subscription (flat fee/tiered plan), a transaction-based platform fee only (as in v0.1's `platformFee` per payment), or both? This determines whether `Tenant.plan` gates feature access (e.g. AI assistant, staff seats) and whether a `TRIAL` state needs an expiry/conversion flow.
2. **Client identity across tenants:** should a client have one global login used across every consultant/tenant they interact with (as drafted, via `ClientTenantMembership`), or should each tenant have fully separate client accounts (i.e., the same person signs up separately per practice)? This materially changes the auth/JWT design in §6.3 and needs to be locked before the schema is finalized.
3. **Org Admin scope:** can the same person be an Org Admin for more than one tenant (e.g. a shared practice-management contractor working across several small practices), or is an Org Admin invite strictly single-tenant only, as currently drafted in FR36?
4. **Custom domains:** confirmed as v1.1/fast-follow rather than v1 — is that acceptable, or is bring-your-own-domain a launch requirement for any anchor tenants?
5. **Tenant-level data residency:** do any target tenants (e.g. certain Medical/Legal practices) require region-pinned storage/database (e.g. India-only), or is a single shared Supabase project/region acceptable for all tenants in v1?
6. **Whisper transcription infra:** self-hosted Whisper on your own GPU infra, or Hugging Face Inference API/Endpoints, for multi-tenant transcription volume? This affects the per-tenant rate-limiting design in Trigger.dev and cost modeling.
7. **Pinecone indexing strategy:** one shared Pinecone index with `tenantId`/`caseId` metadata filtering (cheaper, simpler ops), or a namespace-per-tenant / index-per-tenant approach (stronger isolation, more operational overhead)? Given the RLS-first isolation philosophy, shared index + metadata filter seems consistent — confirm this is acceptable given no regulatory requirement surfaces in Q5.

## 13. Tech Stack

- **Frontend:** Next.js (with middleware-based wildcard subdomain tenant routing), Tailwind CSS, TypeScript, deployed on Vercel
- **Backend/DB:** Prisma (schema/ORM, wrapped in a tenant-injecting Client Extension), Supabase PostgreSQL with Row-Level Security, Pinecone Vector DB (metadata-filtered by `tenantId` + `caseId`)
- **Auth:** Supabase Auth (email/phone OTP, password, optional social login, built-in MFA required for all users) with custom JWT claims (`tenantId`, `role`) via Auth Hooks
- **Calendar Sync:** Google Calendar API and Microsoft Graph API (Outlook), OAuth tokens encrypted at rest, sync orchestrated as a Trigger.dev background task
- **Storage:** Supabase Storage (S3-compatible), tenant-namespaced bucket paths
- **Background Jobs:** Trigger.dev *(decided over Inngest and BullMQ — see §13.1)* for transcription, AI summarization, notifications, reconciliation, calendar sync — all tenant-tagged; chosen specifically for compatibility with Vercel's free Hobby plan (§6.4)
- **Rate Limiting:** Upstash Redis, per-tenant concurrency/rate caps on the job queue
- **Transcription:** Whisper AI via Hugging Face models (async), infra choice per Open Question 6
- **AI Chat / RAG:** LLM + Pinecone, hard-scoped per `caseId` + `tenantId` at the query layer
- **Payments:** Razorpay (India), payouts routed per `TenantSettings.payoutAccountId`
- **Notifications:** Twilio (SMS) + Resend (email) + in-app, tenant-branded sender identity and templates

### 13.1 Supplementary Open Source Libraries `NEW`

The items in §13 are the platform/infrastructure choices already fixed for this project. The table below fills in the application-level libraries needed to build on top of them — each selected for being the current de facto standard in its category (maturity, adoption, active maintenance), not just a convenient default.

| Concern | Library | Why this one |
|---|---|---|
| **Schema validation** | [Zod](https://github.com/colinhacks/zod) | TypeScript-first, ~100M weekly npm downloads, the de facto standard for validating API input/output and deriving types from a single schema — pairs directly with Prisma and tRPC-style API layers. |
| **Form state** | [React Hook Form](https://github.com/react-hook-form/react-hook-form) | The dominant React form library; official `@hookform/resolvers` package wires directly into Zod schemas, so client-side and server-side validation share one source of truth. |
| **UI components** | [shadcn/ui](https://github.com/shadcn-ui/ui) on [Radix UI](https://github.com/radix-ui/primitives) primitives | Unstyled, accessible-by-default primitives (keyboard nav, ARIA out of the box) that ship as owned code rather than a locked dependency — directly supports the WCAG 2.1 AA NFR (§9) rather than fighting it. |
| **Server state / data fetching** | [TanStack Query](https://github.com/TanStack/query) | Ranked #1 in the State of React 2025 survey; handles caching, retries, and background refetching for booking/timeline/dashboard views without hand-rolled fetch logic. |
| **Date/time handling** | [date-fns](https://github.com/date-fns/date-fns) (or [Luxon](https://github.com/moment/luxon) if heavier IANA timezone-database operations are needed) | Directly addresses Edge Cases #6 (timezone display) and #9 (DST transitions on recurring slots) — both libraries are modular, tree-shakeable, and actively maintained (Moment.js, by contrast, is in maintenance-only mode and explicitly not recommended for new projects). |
| **Testing — unit/integration** | [Vitest](https://github.com/vitest-dev/vitest) + [React Testing Library](https://github.com/testing-library/react-testing-library) | Vitest has displaced Jest as the default in Vite-based Next.js projects; RTL is the standard for testing components the way a user actually interacts with them. |
| **Testing — end-to-end** | [Playwright](https://github.com/microsoft/playwright) | The current standard for E2E testing across Chromium/Firefox/WebKit — critical here for the RLS cross-tenant-isolation test suite required by Edge Case #46 (a P0 test class, not optional). |
| **Error tracking & tracing** | [Sentry](https://github.com/getsentry/sentry) (self-hostable or managed) + [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-js) | Sentry has first-party Next.js and background-job integrations for catching failures across the Trigger.dev pipeline; OpenTelemetry is the vendor-neutral instrumentation standard underneath it, avoiding lock-in if the observability backend changes later. |
| **Structured logging** | [Pino](https://github.com/pinojs/pino) | The fastest widely-adopted structured JSON logger for Node.js — matters at multi-tenant volume where every log line should carry `tenantId` for filtering, per the Auditability NFR (§9). |
| **File virus scanning** | [ClamAV](https://github.com/Cisco-Talos/clamav) | The open-source standard antivirus engine (Cisco Talos-maintained), directly implementing `Document.scanStatus` and Edge Case #23's mandatory scan step before a file is marked accessible. **Vercel note:** `clamd` is a persistent daemon and cannot run on Vercel itself (no persistent processes). Run it as a small always-on container on a separate host (Fly.io, Railway, or a Render/ECS service) with a stable internal address; a Trigger.dev task streams each uploaded file to it over the network and writes the resulting `scanStatus` back — Vercel is never in this path directly. |
| **Digital consent / e-signature** *(if pursued — see §4's deferred items)* | [Documenso](https://github.com/documenso/documenso) | Self-hostable, AGPL-3.0, ~13k GitHub stars, built on the same Next.js/PostgreSQL/Prisma stack already in use here — the closest open-source match if intake-consent e-signature (industry-standard per §14) is pulled into a future revision, avoiding a proprietary DocuSign/Adobe Sign dependency. If self-hosted, it deploys as its own Next.js app (can itself run on Vercel) rather than inside Ayushman's codebase; more commonly used via its hosted API/cloud tier to avoid running a second deployment. |
| **Background job queue — decided `UPDATED`** | [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Selected over both Inngest and a self-hosted BullMQ specifically because it's the option that keeps the project deployable on **Vercel's free Hobby plan**: Trigger.dev has its own free tier (10,000 task runs/month), runs its own compute outside Vercel entirely, and ships a first-party Vercel integration (auto-deploys tasks on every push, two-way env var sync, atomic deployments). BullMQ was considered and dropped — its workers are long-running Node processes that would need a separate persistent host regardless (Railway/Fly.io/Render), which adds infrastructure without adding anything Trigger.dev's free tier doesn't already cover for v1 volumes. |

**Selection criteria applied:** active maintenance (commits/releases within the last few months), a license compatible with commercial SaaS use (MIT/Apache-2.0 for most; AGPL-3.0 noted explicitly for Documenso, which requires either self-hosting compliance review or use of their hosted/API tier), and genuine current adoption rather than short-term hype — deliberately favoring libraries that show up repeatedly across independent 2026 ecosystem surveys over ones found in a single blog post.

## 14. Industry Benchmarking Notes (v0.3)

A review of current practice-management platforms — SimplePractice, Sessions Health, and Zanda (health/wellness), Clio (legal), and TaxDome/Uku (accounting) — surfaced the following against this PRD as of v0.2:

**Adopted into v1 scope this revision:**
- In-app secure messaging, scoped per Case (§7.20, §8.6a)
- Two-way calendar sync with Google/Outlook (§7.21, FR10a)
- Waitlist management for full slots (§7.22, FR10b)
- MFA required for all users, not just optional (§6.3)
- WCAG 2.1 AA as an explicit accessibility NFR (§9)

**Explicitly deferred, with rationale:**
- Legal conflict-of-interest checking and trust/IOLTA accounting — out of scope (§4); regulated, jurisdiction-specific, and closer to a separate legal-specific product than a horizontal feature across six consultant categories
- Consultant-facing analytics dashboard beyond the metrics already in §11 — candidate for v1.1
- Recurring/package appointments — candidate for v2, pending demand signal from actual Medical/Physiotherapy/Homeopathy usage patterns, where package pricing is most common

**Considered and not adopted:**
- E-prescriptions, insurance/claims billing, embedded video calling — remain out of scope per §4's original v0.1 decisions; nothing in the industry review changed the reasoning there (regulatory weight and external-tool substitution both still apply)

## 15. Vercel Deployment Review (v0.4) `NEW`

This PRD was reviewed specifically for deployability on Vercel. The architecture was already close — Next.js + Vercel was the starting assumption — but several pieces as originally described would either fail outright on Vercel or silently degrade at scale. The relevant sections above (§6.2, §6.4, §6.5, §6.6, §13.1) have been edited in place; this section is the consolidated summary and the reasoning for each change.

| Constraint | Where it would have broken | Fix applied |
|---|---|---|
| Vercel Functions terminate — no persistent processes | A `clamd` daemon needs an always-on process; a self-hosted BullMQ worker would have too | ClamAV flagged in §13.1 as requiring a separate persistent host (Fly.io/Railway/Render); Vercel only calls out to it. BullMQ was dropped entirely in favor of Trigger.dev (§13.1, `UPDATED`) specifically because it needs no persistent worker of its own |
| Vercel Function execution time is capped (low single-digit seconds by default; a few minutes to ~800s only with explicit config on Pro/Enterprise) | Transcription and AI summarization jobs run for minutes, not seconds | §6.4: Vercel Functions only *enqueue* work; Trigger.dev's own compute executes it, with no execution time limit on the task side. This was already the plan — now stated as a hard requirement, not a preference |
| Vercel Function request body limit is 4.5MB | Audio recordings and long sessions (Edge Case #14, >1hr recordings) exceed this immediately if uploaded through an API route | §6.6: browser uploads directly to Supabase Storage via a short-lived signed URL; the Vercel Function only issues the URL and later records the metadata |
| No persistent WebSocket support on Vercel Functions | In-app messaging (§7.20) and live notification badges need push updates, not polling | §6.5: use Supabase Realtime (hosted by Supabase) for live updates; Vercel stays request/response only |
| Edge Runtime historically couldn't run a standard Prisma client (no raw TCP to Postgres) | Tenant resolution in the routing layer (§6.2) needs a normal RLS-aware Prisma query per request | As of Next.js 16, this file (`middleware.ts` → `proxy.ts`) runs on the **Node.js runtime by default**, which removes this constraint — flagged as a version-dependent fact to re-verify at build time, since pinning an older Next.js version or opting into `runtime = "edge"` would reopen it |
| Serverless functions invoked at high concurrency each want their own DB connection | Could exhaust Supabase's Postgres connection limit under real multi-tenant load | §6.1: Prisma uses Supabase's pooled (Supavisor, transaction-mode) connection string on the request path; direct connection reserved for migrations only |
| Wildcard subdomains aren't available on all Vercel plans | Core tenant-routing mechanism (`{subdomain}.yourplatform.com`) silently unavailable on Hobby | §6.2: explicitly flagged — Vercel Pro or Enterprise is a build prerequisite for this specific feature, independent of the background-job choice below |
| Vercel Function default (10s Hobby / 60s Pro) timeout would break any inline background-job pattern | An earlier fallback option (self-hosted BullMQ) would have needed its own always-on worker host, adding infrastructure beyond Vercel + Supabase | **`UPDATED`:** standardized on **Trigger.dev** (§6.4, §13.1) — its free tier (10,000 task runs/month) and Vercel-native integration mean the background-job layer itself no longer forces a paid Vercel plan or a third hosting account |

**Net effect:** no change to the product's scope or feature set — this was purely an infrastructure-correctness pass. The background-job decision now specifically supports free-tier Vercel deployment (Trigger.dev's free tier + Vercel Hobby). What's still true, independent of that: **wildcard subdomains require Vercel Pro/Enterprise regardless** (a core product requirement, not a job-queue side effect), and **Documenso and ClamAV still require hosting outside Vercel** if/when they're adopted — that's a small additional piece of infrastructure (one more platform account, e.g. Fly.io or Railway) worth confirming you're fine taking on before build starts.

## 16. Self-Hosted & Non-Vercel Deployment Alternatives (v0.6) `NEW`

This PRD was drafted specifically for Vercel deployability, but the architecture itself is not locked to Vercel — the tech stack (Next.js, Trigger.dev, Supabase, Prisma) all run elsewhere. This section reviews the most practical alternatives if you want to dev host or deploy outside Vercel.

### 16.1 Why you might choose non-Vercel

The main reasons to move away from Vercel for this specific app:

1. **Wildcard subdomains cost**: Vercel Pro/Enterprise is required for the tenant-routing mechanism (`{tenant}.yourplatform.com`); the free Hobby plan doesn't support wildcard subdomains at all. If that's a blocker, Vercel isn't an option regardless of backend complexity.
2. **Regulatory or data residency**: You need the entire app (frontend + backend + database) in a specific region (e.g. India-only) with no data leaving that region. Vercel's global CDN and split architecture (frontend on edge, backend serverless) make this difficult. Self-hosting gives you full control.
3. **Cost predictability at scale**: Vercel's usage-based billing (bandwidth overages, extra function invocations) can become unpredictable with high traffic. A flat monthly fee on Render or Railway may be cheaper if your traffic is consistent.
4. **Docker control**: Vercel functions don't let you run arbitrary Docker containers or control system-level packages (e.g. Graphviz, PostScript tools). Other platforms do.

### 16.2 The best non-Vercel options

| Platform | Best for | Multi-tenant fit | Database | Free tier | Note |
|---|---|---|---|---|---|
| **Railway** | MVP speed, variable-traffic apps | Good (simple Git deploy) | One-click Postgres/MySQL/MongoDB/Redis, included in usage credits | $5 trial credit (no card) | Fastest code → URL. Usage-based pricing scales to zero. Recent reliability issues (outages) make it risky for production; better for dev/staging. |
| **Render** | Production workloads, predictable billing | Good (managed Postgres extra) | Managed Postgres ($7/mo extra), or bring your own | Free tier for static sites + limited web service hours | Predictable monthly pricing ($7-25+/mo per service). Managed HA Postgres. Modern Heroku replacement. Reliable uptime. |
| **Fly.io** | Global scale, multi-region | Good (Docker-first, full control) | Fly Postgres (manual setup) or external | No permanent free tier; need credit card | 35+ regions, multi-region by default. Full Docker control. Higher operational complexity. Start on Railway, graduate to Fly if you need global latency. |
| **Coolify** | Full self-hosted control, cost optimization | Excellent (run on any VPS) | Any Docker service (Postgres, MySQL, etc.) | Free, open-source | Install on your own VPS (Hetzner, DigitalOcean, etc.) ~$5-20/mo for a small VPS. No vendor lock-in, but operational burden on you (updates, backups, monitoring). Security vulnerabilities reported in 2026 — vet carefully. |
| **Dokploy** | Simpler self-hosted, Vercel-like UX | Good (Docker, one-click deploy) | Any Docker service | Free ($0), managed hosting ($4.50/mo) | Open-source, runs on your VPS. Simpler ops story than pure Coolify, but smaller ecosystem. |

### 16.3 Architecture adjustments needed for each

**Railway / Render / Fly.io (managed PaaS):**
- Next.js app deploys as a containerized service alongside a separate Postgres database. The Prisma pooled connection string connects through whatever database they provision (all three support it well).
- Trigger.dev tasks still run on Trigger.dev's compute (not changing). Vercel Functions → Trigger.dev enqueue pattern becomes Render/Railway Functions → Trigger.dev, same architecture.
- ClamAV is still needed as an external service (see §13.1) but can run as a separate container on the same platform (Render/Railway/Fly.io all support it).
- Wildcard subdomains work via a reverse proxy (Cloudflare or the platform's own DNS) pointing to the app's single URL and using Next.js middleware to extract the subdomain, matching what you'd do on Vercel anyway.

**Coolify / Dokploy (self-hosted):**
- You manage your own VPS (e.g. Hetzner Cloud 2GB/40GB ~€6/mo, DigitalOcean Droplet ~$6/mo). Install Coolify/Dokploy on it, then deploy your Docker containers from there (your Next.js app, Postgres, optionally ClamAV).
- No vendor-specific dependencies; standard Docker Compose or Kubernetes configs work everywhere.
- Trigger.dev still runs on Trigger.dev's compute (they're independent).
- Wildcard subdomains require Caddy or Nginx reverse proxy config on your VPS; more hands-on than managed platforms, but fully supported.
- Operational load is higher: you patch the OS, monitor disk space, configure backups, set up SSL (Caddy does this auto with Let's Encrypt). Coldify and Dokploy reduce this compared to raw Docker, but you're still responsible.

### 16.4 Recommended path for development

1. **Start with Railway** for dev/staging environments. Fastest iteration, usage-based pricing, one-click Postgres. Don't worry about the reliability concerns yet — for non-production, it's fine. Deploy with `railway up` or connect GitHub.
2. **Graduate to Render** if/when you need production stability and predictable billing. Managed HA Postgres, zero-downtime deploys (with config), PITR (point-in-time recovery for databases). Monthly cost is fixed ($25–50+ depending on traffic), which is easier to budget than usage-based.
3. **Consider Fly.io** only if your user base becomes geographically distributed and latency matters. Multi-region adds significant operational complexity (managing secrets per region, routing, database replication).
4. **Use Coolify/Dokploy only if**: you have specific regulatory requirements (India data residency), need extremely cheap hosting, or already have infrastructure ops expertise. The operational burden is real.

### 16.5 The wildcard subdomain workaround (non-Vercel)

All non-Vercel platforms require you to manage wildcard DNS + reverse proxy yourself. Here's the pattern:

1. **DNS wildcard** (`*.yourdomain.com` → your-app-url`)
2. **Reverse proxy** (Cloudflare or platform-provided, or self-hosted Caddy/Nginx) extracts the subdomain and forwards to your app
3. **Next.js middleware** (your code) reads the subdomain from `request.headers.host` and maps it to the correct tenant
4. **This is exactly what you'd do in the middleware anyway** — the only difference is Vercel Pro/Enterprise gives you wildcard support as a platform feature; everywhere else, you do it yourself with standard HTTP headers.

No architectural change to the app itself; just one extra layer of DNS/proxy config. Well-documented patterns exist for all three platforms.

### 16.6 Docker Compose Deliverable `NEW`

**Instruction:** engineering must produce a `docker-compose.yml` at the repo root (plus a `docker-compose.override.yml` for local dev conveniences, e.g. hot-reload volumes) so the entire application can be self-hosted — on Coolify, Dokploy, a bare VPS, or a developer's laptop — without depending on Vercel or any Vercel-specific behavior. This is a required deliverable for v1, not an optional nice-to-have, since §16 commits to self-hosting being a genuinely supported path, not just a theoretical one.

**Required services in the compose file:**

| Service | Image / source | Purpose | Notes |
|---|---|---|---|
| `app` | Built from repo `Dockerfile` (Next.js `output: "standalone"`) | The Ayushman Next.js application | Must build in standalone mode per the self-hosting failure patterns noted in §16.3 (Sharp bundled correctly, `--max-old-space-size` tuned to container memory) |
| `postgres` | `postgres:16` (or `supabase/postgres` — see mode note below) | Primary database with RLS policies (§6.1) | Named volume for data persistence; migrations run via `prisma migrate deploy` as a one-off init container or entrypoint step, never on every boot |
| `clamav` | `clamav/clamav` official image | Virus scanning daemon (§13.1) | Named volume for signature database (`freshclam` updates) so signatures persist across restarts; healthcheck required before the app is allowed to mark uploads scanned |
| `redis` | `redis:7` (or `redis:7-alpine`) | Local Upstash-compatible store for rate limiting (§6.4) when not using managed Upstash | Only needed in fully self-hosted mode; omit if still using managed Upstash Redis over the network |
| `caddy` | `caddy:2` | Reverse proxy: wildcard subdomain routing + automatic TLS (Let's Encrypt) | Replaces what Vercel's platform gives you natively (§16.5) — this is the piece that makes `{tenant}.yourdomain.com` work outside Vercel |
| `documenso` *(optional)* | `documenso/documenso` official image | Self-hosted e-signature, only if the v1.1 consent-forms feature (§4, §13.1) is pursued and the hosted Documenso tier isn't used instead | Needs its own Postgres database — either a separate `postgres` service or a separate schema on the shared instance |

**What stays external regardless of self-hosting mode** — these are managed SaaS dependencies with no meaningful self-hosted equivalent in scope, so they are **not** in the compose file: Trigger.dev (§6.4's whole point was avoiding a self-hosted worker), Pinecone, Razorpay, Twilio, Resend, and the Whisper transcription endpoint (Hugging Face Inference API, per Open Question 6, unless self-hosted Whisper on GPU infra is chosen — which would be a separate `whisper` service with its own GPU requirements, out of scope for this compose file's default configuration).

**Two self-hosting modes to decide between and document in the compose file's README:**
1. **Hybrid** — self-host only `app` + `postgres` + `clamav` + `caddy`, but keep Supabase Auth, Storage, and Realtime as the managed Supabase cloud product (still gets you off Vercel without giving up Supabase's auth/storage convenience).
2. **Full self-host** — additionally run Supabase's own official `docker-compose` stack (the `supabase/docker` repository, which bundles Postgres, GoTrue auth, Storage API, Realtime, Kong gateway, and Studio) so Auth/Storage/Realtime are also self-hosted, not just the app and database. This is the only way to fully satisfy a hard data-residency requirement (Open Question 5) if one exists.

**Acceptance criteria for this deliverable:**
- `docker compose up` brings up a fully working local environment (app reachable, database migrated, RLS policies applied, ClamAV ready) with no manual steps beyond populating a `.env` file.
- A `.env.example` file documents every required variable (DB connection strings — pooled and direct, Supabase keys or self-hosted equivalents, Trigger.dev API key, Razorpay/Twilio/Resend/Pinecone keys, `CLAMAV_HOST`, Caddy's domain config).
- Named volumes exist for `postgres` data and `clamav` signature definitions so a `docker compose down` (without `-v`) doesn't lose data.
- Healthchecks are defined for `postgres` and `clamav` so `app` doesn't start accepting traffic before its dependencies are ready.
- The wildcard subdomain routing (§16.5's pattern) is demonstrably working through the `caddy` service against at least one test subdomain in local dev (e.g. `tenant1.localhost`).
