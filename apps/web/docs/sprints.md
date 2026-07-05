# Ayushman — Step-by-Step Development Sprints

This document outlines the detailed, step-by-step sprint plan for building **Ayushman** (the Consultant Context & Client Relationship Platform). The plan translates the requirements from [readme.md](readme.md), [phase_scope_ayush.md](phase_scope_ayush.md), [schema_ayushman.md](schema_ayushman.md), [architecture_ayush.md](architecture_ayush.md), and [appflow_ayush.md](appflow_ayush.md) into concrete, actionable tasks.

---

## 🛠️ Technology Stack & Foundations
* **Frontend UI**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4), **shadcn/ui** + **Radix UI**
* **Responsiveness**: Fully responsive layout optimized for both **Desktop and Mobile views**
* **Authentication**: **Supabase Auth** (Email/phone OTP, password, optional social logins). Add required secret keys to be used in .env file. Allow me to add those.
* **Backend Database**: Supabase PostgreSQL + **Prisma ORM**
* **Vector Store**: **Pinecone** (deferred to Phase 5 / AI Backlog integration)
* **File Storage**: **Supabase Storage** (S3-compatible buckets for audio, documents, and verification PDFs)
* **Audio & Speech-to-Text**: **Whisper AI** with Hugging Face models (asynchronous pipeline with BullMQ & Redis)
* **Notifications**: **Twilio** (SMS) & **Resend** (email)
* **Payments**: **Razorpay** (India gateway)
---

## Phase 0: Foundation (Weeks 1–3)
**Goal**: Infrastructure provisioning, mono/multi-package repo boilerplate, and the database/ORM layer ready. No user-facing business logic.

### Sprint 0.1: Repository and Linting Boilerplate
1. Initialize a Git repository at `the project repository root`.
2. Bootstrap Next.js 15 App Router using TypeScript and Tailwind CSS v4.
3. Configure `tsconfig.json` for path aliases (e.g. `@/*`).
4. Set up linting and formatting:
   * **ESLint** (strict rules for Next.js and TypeScript).
   * **Prettier** for styling rules.
   * **Husky** with `lint-staged` for pre-commit hooks.
5. Create basic GitHub Actions workflow (`.github/workflows/ci.yml`) to run linting, type-checking, and tests.

### Sprint 0.2: Database Layer & Prisma Orchestration
1. Setup local PostgreSQL or run a development database via Docker/Supabase CLI.
2. Initialize **Prisma ORM** in the project.
3. Port the entities from [schema_ayushman.md](schema_ayushman.md) into `prisma/schema.prisma` including:
   * `User`, `ClientProfile`, `ConsultantProfile`, `GuardianLink`
   * `AvailabilitySlot`, `Case`, `Appointment`, `Interaction`
   * `Commitment`, `Task`, `Document`, `Review`, `Notification`, `Payment`, `AuditLog`
4. Set up mapping from `users.supabase_auth_user_id` to Supabase `auth.users.id`.
5. Run the initial Prisma migration (`npx prisma migrate dev --name init`).
6. Write a database seeding script (`prisma/seed.ts`) to populate:
   * Core consultant categories (`MEDICAL`, `LEGAL`, `IT`, `PHYSIOTHERAPY`, `HOMEOPATHY`, `ASTROLOGY`).
   * Mock consultants and clients for testing.
   * Basic availability slots.

### Sprint 0.3: Supabase & Services Provisioning
1. Provision a development/staging Supabase project.
2. Configure **Supabase Storage** buckets:
   * `verification-documents` (private bucket)
   * `case-documents` (private bucket)
   * `session-audio` (private bucket)
3. Set up **Row-Level Security (RLS)** in PostgreSQL targeting case-scoped tables (`cases`, `interactions`, `commitments`, `tasks`, `documents`).
4. Configure local environment variables (`.env.local` / `.env`):
   * Database URL, Supabase URL, service role keys, public keys, Twilio credentials, Resend API keys, Razorpay credentials.
5. Setup a local **Redis** instance (via Docker or local package) for BullMQ queues.
6. Initialize the transcription queue processor using **Whisper AI via Hugging Face API/models** (stub with a mock for local development and real Hugging Face Inference API calls on staging).

---

## Phase 1: Onboarding, Direct Booking & Calendar (Weeks 4–10)
**Goal**: User registration, single-consultant onboarding with self-attested credentials, direct booking via `/book` (no discovery/search), slot booking, and weekly calendar views.

### Sprint 1.1: Authentication & Profiles (Weeks 4–5)
1. Build authentication pages/routes using **Supabase Auth** helper libraries (Next.js server actions/client components):
   * Login, Registration, OTP Verification, Password Reset.
2. Implement Profile Setup pages:
   * **Client Profile Page**: Dynamic profile inputs (fullName, dob, gender, preferredLanguage, timezone). Integrate the `GuardianLink` mapping if the user's age is under 18 years (Minor).
   * **Consultant Profile Page**: Form to input biography, qualifications, timezone, consultation fee, languages, and primary category selection.
3. Build responsive shell layouts containing headers, profile avatar shortcuts, and user role-based menus (desktop sidebar, mobile bottom navbar).

### Sprint 1.2: Consultant Credentials Upload (Week 5–6)
1. Implement the consultant document upload widget (self-attested, no platform review queue):
   * Integrate direct-to-storage upload using **Supabase Storage signed URLs**.
   * Tiered document requirements validation:
     * `MEDICAL`/`LEGAL`: license number + license PDF + qualification certificate PDF.
     * `PHYSIOTHERAPY`/`IT`: qualification certificate PDF.
     * `ASTROLOGY`/`HOMEOPATHY`: identity document + qualification certificate PDF.
2. Consultant profile is active immediately after required fields are saved; "Accept Bookings" is a self-toggle (see `appflow_ayush.md` §4, §7.2).

### Sprint 1.3: Public Booking Page (Week 6–7)
1. Build the public booking page (`/book`) for this instance's single Consultant:
   * Bio, qualifications, reviews summary, languages, fee, and credential badges (display only).
   * Embedded slot picker showing published OPEN availability.
   * No consultant search, filter, listing, or discovery surfaces.
2. Client Dashboard links directly to `/book` — there is no "find a consultant" step.

### Sprint 1.4: Dynamic Availability Slots Builder (Week 7–8)
1. Implement **Consultant Availability Manager** (`/consultant/availability`):
   * Visual weekly grid to configure recurring hours.
   * Calendar overrides interface to select specific dates and block out slots.
2. Develop backend timezone evaluation helpers:
   * Safely parse slot times (`TIME`) and evaluate them relative to the consultant's profile timezone. Ensure correct DST calculations dynamically when mapping dates.
   * Add database locking checks (using the `version` column in `availability_slots` table) to prevent race conditions during slot adjustments.

### Sprint 1.5: Booking Lifecycle & Calendar Tab (Weeks 8–10)
1. Implement booking transaction API with strict race checks:
   * Perform double-booking prevention in database using transaction isolates.
2. Build the **Weekly Calendar View component**:
   * Integrate **FullCalendar** (`@fullcalendar/react` using `timeGridWeek`) optimized for both mobile and desktop screen sizes.
   * **Client Calendar** (`/calendar`): Shows user's scheduled sessions with status color indicators.
   * **Consultant Calendar** (`/consultant/calendar`): Shows upcoming appointments and booked blocks.
   * Implement day overview drawer/modal for chronological lists of daily meetings.
3. Implement appointment state controls (Approve, Reschedule Proposal, Decline, Cancel).
4. Configure background cron job to auto-expire unresolved booking requests after a configurable period (e.g. 24 hours).

---

## Phase 2: Case Management — Sessions, Commitments & Documents (Weeks 11–17)
**Goal**: Active interaction tracking, in-browser recording, Whisper transcription integration, document management, client tasks, and chronological case timelines.

### Sprint 2.1: Case Initiation & Recording Consent (Weeks 11–12)
1. Implement **Case Lifecycle API**:
   * Create or fetch a `Case` when booking is approved.
   * Add constraint checking (prevent closing cases with outstanding tasks or pending commitments).
2. Create **Interaction Screen** (`/cases/[caseId]/session`):
   * Implement audio recording interface using the browser's `MediaRecorder API` with `recordrtc` fallback.
   * Build **Recording Consent Widget**: Secure explicit client consent log before initiating audio record.

### Sprint 2.2: Async Audio Transcription Pipeline (Weeks 12–13)
1. Build audio chunking and upload handler:
   * Send file stream directly to Supabase Storage `session-audio` folder.
2. Connect queue worker via **BullMQ**:
   * Set up queue handler trigger on file completion.
   * Call Whisper AI with Hugging Face API models, parsing output into timeline structures.
   * Broadcast status updates via WebSockets (`Realtime` status).
3. Build manual transcripts override editor for consultants to resolve transcription errors or failed jobs.

### Sprint 2.3: Document Storage, Versioning & Access Control (Weeks 13–14)
1. Build Document Manager components inside Case views:
   * Support PDF, PNG, JPG files.
   * Track file versions via database fields (`previousVersionId`).
2. Add security gates:
   * Check file extensions and size on the server side.
   * **Visibility Toggle**: Document uploads remain "Draft/Private to Consultant" by default. Require explicit consultant click to "Share with Client" before exposing in client timeline.

### Sprint 2.4: Commitments & Clients Tasks (Weeks 14–15)
1. Implement interactive logger inside the interaction editor:
   * Add inline forms to log commitments (consultant to-dos) and tasks (client to-dos).
   * Specify deadlines and urgency tags.
2. Create a background cron job to track deadlines:
   * Flag expired items as `MISSED` or `OVERDUE` automatically.
   * Send push alerts or emails using **Resend** / **Twilio**.

### Sprint 2.5: Chronological Case Timeline & Notifications (Weeks 15–17)
1. Build **Chronological Case Timeline** (`/cases/[caseId]`):
   * Unify events: Appointments, Interactions, Transcripts, Documents, Commitments, and Tasks.
   * Support full-text search, categories filter, and pagination.
2. Set up **Notification Preferences Panel**:
   * Allow users to opt-out or switch preferred channels (In-app, SMS, Email).

---

## Phase 3: Trust, Payments, Security & Compliance (Weeks 18–24)
**Goal**: Credit card/UPI processing, client reviews, audit logging, access controls, and admin disputes dashboard.

### Sprint 3.1: Post-Appointment Client Reviews (Week 18–19)
1. Build review submission form:
   * Allow clients to submit rating (1-5 stars) and feedback text once an appointment is marked `COMPLETED`.
2. Connect Database triggers:
   * Update the average consultant rating (`ratingAvg`) automatically using the `reviews_refresh_rating` trigger.
   * Handle ratings adjustments on review deletion.
3. Build reviews visibility controls for the Consultant (hide inappropriate reviews on their public `/book` page).

### Sprint 3.2: Razorpay Billing & Payout Integration (Weeks 19–21)
1. Integrate the **Razorpay SDK** in the checkout wizard.
2. Build signature-verified Webhook handler (`POST /payments/webhook`) to handle payment confirmation.
3. Develop checkout policies:
   * "Pay-on-Booking" vs "Pay-after-Session" routing configuration.
   * Pre-scheduled webhook drift cleanup job to sync payment failures.
4. Implement automatic Invoice PDF generator (served using Next.js api routes).
5. Build Consultant Payouts Ledger showing historical earnings and pending bank transfers.

### Sprint 3.3: Strict Compliance, Access Policies & Audit Logs (Weeks 21–22)
1. Conduct complete audit of PostgreSQL RLS rules:
   * Ensure clients can only view cases in which they are the direct client (or verified parent/guardian).
   * Ensure consultants can only read data for cases they own.
2. Implement **Audit Logging Interceptor**:
   * Record every instance where an org Admin accesses sensitive Case content during a dispute (requires explicit `access_justification` written to the audit database).

### Sprint 3.4: Org Admin Team & Disputes (Weeks 22–23)
1. Build org team management (`/settings/team`):
   * Consultant can invite/revoke org Admins (staff) to help manage calendar, cases, and disputes.
2. Build dispute resolution UI (`/settings/disputes`):
   * Consultant and org Admins mediate payment disputes and no-show claims.
3. Integrate profile deletion pipelines:
   * Anonymize or retain records based on regulatory rules (Medical/Legal conflicts).

### Sprint 3.5: Hardening & Performance Testing (Weeks 23–24)
1. Set up Redis-backed request rate limiters.
2. Implement column-level encryption for sensitive client details and transcripts.
3. Set up **Sentry** client-side and server-side tracking.
4. Conduct WCAG 2.1 AA screen reader compatibility checks.

---

## Phase 4: Scaling & Launch Readiness (Weeks 25–30)
**Goal**: Database optimization, load testing, cache tuning, and deployment verification.

1. Implement Database connection pooling utilizing PgBouncer or Supabase connection poolers.
2. Create read-replicas configuration to offload timeline-read traffic.
3. Set up BullMQ worker replicas to balance massive audio queue spikes.
4. Apply CDN caching rules for the public `/book` page and avatars.
5. Create database indexing profiles on `Case`, `Interaction`, and `Appointment` filters.
6. Configure automated AWS S3/Supabase Storage lifecycle rules to archive aged session files.

---

## Phase 5: Post-v1 Backlog Roadmap (Weeks 31+)
* **AI Assistant / RAG Integration**: Scoped vector searches, vector database setup with **Pinecone**, and context-aware chat summarizing.
* **Clinic Management**: Multi-consultant clinics (multiple Consultant identities per instance).
* **Native Mobile Apps**: Dedicated iOS and Android native companion apps.
* **Embedded Video Calling**: Direct in-app video streams.
* **International Currencies**: Support for Stripe or alternative cross-border processors.
