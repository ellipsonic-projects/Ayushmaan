# Ayushman — System Architecture Documentation

**Version**: 1.1.0
**Last Updated**: July 2026
**Source PRD**: [`readme.md`](readme.md) (Consultant Context & Client Relationship Platform, v0.1)

---

## 1. Architecture Overview

### 1.0 Product Model

Ayushman is a **single-consultant practice platform**, not a consultant marketplace. Each deployment serves **one Consultant** (the practice owner) who manages their own Clients. There is **no consultant discovery, search, listing, or exploration** — Clients register and book directly with this instance's one Consultant via the public booking page (`/book`).

As the practice scales, the primary Consultant can **invite additional org Admins** (staff) who share operational access — calendar, appointment requests, client cases, payouts — without introducing a second Consultant identity or multi-practice marketplace semantics. The `ADMIN` role is **org-scoped staff**, not a platform operator who verifies or approves consultants across tenants.

| Concept | v1 behavior |
|---------|-------------|
| Consultant | Exactly one per instance; practice owner; full clinical/operational access |
| Client | Registers directly with this Consultant; no consultant selection step |
| Org Admin | Invited by the Consultant; delegated ops access (scheduling, cases, disputes) |
| Platform Admin | **Does not exist** — no verification queue, no cross-tenant moderation |

Ayushman is a **modular monolith at the API layer, backed by managed Postgres (Supabase) per deployment**, with clear service boundaries so individual modules (transcription, RAG/AI, payments) can be split into independent services as load grows. The system is optimized for three properties the PRD calls out explicitly: **strict per-case data isolation** (RLS-enforced, not just app-level), **async-by-default** for anything unbounded (transcription, embeddings, summarization), and **auditability** of every sensitive-data access.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                     │
│                                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │  Ayushman Web (Next.js 15) — single app, role-aware routing               │   │
│   │  Deployed on Vercel                                                        │   │
│   │  Public: /, /book (this instance's Consultant profile + slot picker)       │   │
│   │  Client: /dashboard, /my-cases, /calendar                                  │   │
│   │  Consultant: /consultant/*, /cases/*, /settings/team (invite org admins)   │   │
│   │  Org Admin: /consultant/* (delegated), /settings/audit-log                 │   │
│   └────────────────────────────────┬─────────────────────────────────────────┘   │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │ HTTPS + WSS (Supabase Realtime)
┌────────────────────────────────────┼─────────────────────────────────────────────┐
│                     EDGE / CDN LAYER│                                             │
│              ┌─────────────────────▼─────────────────────────────────────┐     │
│              │                  Cloudflare CDN + WAF                        │     │
│              │   Static Assets | DDoS Protection | Bot Mitigation           │     │
│              └───────────────────────┬─────────────────────────────────┘     │
└──────────────────────────────────────┼─────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼───────────────────────────────────────────┐
│                                API GATEWAY LAYER                                   │
│                        ┌───────────────▼────────────────┐                          │
│                        │   Nginx / Managed API Gateway   │                          │
│                        │   Rate Limiting | CORS | mTLS    │                          │
│                        │   to internal services | SSL     │                          │
│                        └───────────────┬────────────────┘                          │
└─────────────────────────────────────────┼───────────────────────────────────────────┘
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       │                                  │                                  │
┌──────▼─────────────────────┐  ┌─────────▼──────────────────┐  ┌────────────▼───────────────┐
│   CORE API (Node.js +       │  │  REALTIME GATEWAY            │  │  AI / RAG SERVICE            │
│   NestJS/Express)           │  │  (Supabase Realtime +        │  │  (Node.js, provider-agnostic │
│   Containerized, auto-scale │  │   thin WS relay)              │  │   LLM client)                │
│                              │  │                               │  │                              │
│  ├── /auth/*                 │  │  Channels:                    │  │  ├── /ai/chat                │
│  ├── /consultants/me/*       │  │   case:{caseId}                │  │  ├── /ai/recap                │
│  ├── /clients/*              │  │   user:{userId}                │  │  ├── /ai/feedback             │
│  ├── /org/admins/*           │  │                                │  │                              │
│  ├── /availability/*          │  │                                │  │                              │
│  ├── /appointments/*          │  │  Emits: appointment updates,   │  │  Hard-scoped retrieval:      │
│  ├── /cases/*                 │  │  commitment/task due, doc      │  │  filter by caseId at the    │
│  ├── /interactions/*          │  │  uploaded, notification:new    │  │  DB/query layer, never      │
│  ├── /commitments/*           │  └────────────────────────────────┘  │  prompt-level only          │
│  ├── /tasks/*                  │                                      └───────────┬───────────────┘
│  ├── /documents/*               │                                                  │
│  ├── /payments/*                 │                                                  │
│  ├── /notifications/*             │                                                  │
│   └── /org/*                        │  (team invites, audit — org-scoped, not platform)   │
└──────────────────┬───────────────┘                                                  │
                    │                                                                  │
        ┌───────────┴──────────────────────────────────────────────────────────────────┘
        │                 SERVICE LAYER (domain services, shared by Core API & workers)
        │
        │  AuthService        | ConsultantService     | ClientService
        │  AvailabilityService| AppointmentService     | CaseService
        │  InteractionService | CommitmentTaskService  | DocumentService
        │  TranscriptionService (orchestration only)   | RAGService (orchestration only)
        │  PaymentService     | NotificationService    | ReviewService
        │  OrgAdminService    | AuditService
        └───────────┬─────────────────────────────────────────────────────────────────┐
                    │                                                                  │
    ┌───────────────┼──────────────────┬──────────────────┬─────────────────┬─────────▼─────────┐
    │               │                  │                  │                 │                    │
┌───▼─────────┐ ┌───▼──────────┐ ┌─────▼──────────┐ ┌─────▼──────────┐ ┌────▼───────────┐ ┌──────▼──────┐
│ Supabase     │ │ Redis        │ │ Supabase        │ │ Job Queue        │ │ Hugging Face    │ │ Razorpay /   │
│ Postgres     │ │ (Upstash)    │ │ Storage (S3-    │ │ (BullMQ/pg-boss  │ │ Whisper AI /    │ │ Twilio SMS   │
│ + Row-Level  │ │ Cache | Rate │ │ compatible)     │ │ on Redis)        │ │ Models          │ │ (payments/   │
│ Security     │ │ Limit |      │ │ audio/          │ │                  │ │ (async          │ │ SMS)         │
│ & Pinecone   │ │ Session      │ │ documents       │ │ TranscriptionQ   │ │ transcription)  │ │              │
│ Vector DB    │ │ Blacklist    │ │ buckets, per-   │ │ EmbeddingQ       │ │                 │ │              │
│              │ │              │ │ case scoping    │ │ NotificationQ    │ │ Provider-        │ │              │
│              │ │              │ │                 │ │                 │ │ agnostic LLM     │ │              │
└──────────────┘ └──────────────┘ └─────────────────┘ │ ReminderQ        │ │ (OpenAI/         │ └──────────────┘
                                                        │ ExpiryQ          │ │ Anthropic/etc.)  │
                                                        │ PayoutReconcileQ │ └─────────────────┘
                                                        │ DocScanQ         │
                                                        └──────────────────┘
```

**Why this shape:**
- **Supabase Postgres + Pinecone Vector DB**: Supabase Postgres is the system of record for relational data (cases, appointments, commitments) under strict RLS, while Pinecone acts as the dedicated external Vector Database for case-scoped semantic embeddings, avoiding context-window bottlenecks (Edge Cases #27, #28).
- **RLS is a second, DB-enforced layer of tenant isolation**, not a replacement for app-layer scoping. Both layers filter by `caseId` / `consultantId` / `clientId` (FR35, Edge Case #28).
- **Everything unbounded or slow (transcription, embeddings, summarization, notification fan-out, payout reconciliation) is a queued job**, never inline in a request/response cycle (NFR: Scalability, Availability).
- **The AI/RAG service is a separate deployable** from the Core API so a prompt-injection bug, a slow LLM provider, or a runaway summarization job cannot degrade booking/payments — the platform's revenue-critical paths.

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR for public booking page (`/book`), RSC for data-heavy timeline views |
| Language | TypeScript | Type safety across shared Prisma types |
| UI Library | shadcn/ui + Radix UI | Accessible primitives, fast to theme per category (Medical/Legal/etc.) |
| Styling | Tailwind CSS v4 | Utility-first |
| State Management | Zustand | Auth/session, UI state |
| Server State | TanStack Query v5 | Timeline pagination, case lists, caching, optimistic updates on tasks/commitments |
| Forms | React Hook Form + Zod | Onboarding forms, availability builder, booking forms |
| Real-time | Supabase Realtime client | Appointment status, notification badges, task/commitment due updates |
| Audio Capture | MediaRecorder API + `recordrtc` fallback | In-browser session recording (FR12) |
| HTTP Client | Axios (interceptors for refresh) | Consistent request/response handling |
| Auth | Supabase Auth (email/phone OTP, password, social) | Matches `supabase-setup_ayushman.md`; JWT verified by API middleware; synced to `public.users` via `supabase_auth_user_id` |
| File Upload | Uppy / React Dropzone + Supabase signed URLs | Direct-to-storage upload for docs/audio |
| Rich Text | Tiptap | Consultant notes (FR14) |
| Charts (Org settings) | Recharts | Payout trends, appointment volume, audit summaries |
| i18n | next-intl | Multi-language UI (NFR: Localization) |
| Deployment | Vercel | Edge network, ISR for public booking page |

### 2.2 Directory Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx           # role selection: CLIENT | CONSULTANT (Consultant slot once)
│   │   └── layout.tsx
│   ├── (onboarding)/
│   │   ├── consultant/
│   │   │   ├── category/page.tsx        # exactly one category (FR2)
│   │   │   ├── profile/page.tsx         # bio, qualifications, credentials upload (self-attested)
│   │   │   └── availability/page.tsx    # initial weekly schedule
│   │   ├── client/
│   │   │   └── profile/page.tsx         # conditional fields per category (FR4)
│   │   └── layout.tsx
│   ├── (public)/
│   │   ├── page.tsx                     # landing — this Consultant's marketing page
│   │   └── book/
│   │       ├── page.tsx                 # public profile + slot picker (ISR), no search/list
│   │       └── appointment/page.tsx     # authenticated booking flow
│   ├── (app)/
│   │   ├── dashboard/page.tsx           # role-aware: consultant vs client
│   │   ├── appointments/
│   │   │   ├── page.tsx                 # list + status actions (FR7–FR10)
│   │   │   └── [id]/page.tsx
│   │   ├── cases/
│   │   │   ├── page.tsx                 # case list (consultant/admin) / my cases (client)
│   │   │   └── [caseId]/
│   │   │       ├── timeline/page.tsx    # FR21, FR22
│   │   │       ├── ai-chat/page.tsx     # FR23–FR28
│   │   │       ├── interactions/[interactionId]/page.tsx
│   │   │       ├── documents/page.tsx
│   │   │       └── commitments-tasks/page.tsx
│   │   ├── session/[appointmentId]/page.tsx   # Start Session, recorder UI (FR11–FR16)
│   │   ├── notifications/page.tsx
│   │   ├── payments/page.tsx            # payout ledger, invoices (FR33, FR34)
│   │   ├── settings/
│   │   │   ├── team/page.tsx            # invite/revoke org Admins (Consultant only)
│   │   │   ├── audit-log/page.tsx       # org audit trail (Consultant + Admin)
│   │   │   └── disputes/page.tsx        # payment/no-show disputes (Consultant + Admin)
│   │   └── layout.tsx                   # sidebar/header
│   ├── layout.tsx
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/                              # shadcn/ui generated
│   ├── common/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── EmptyState.tsx
│   │   └── SkeletonCard.tsx
│   ├── consultant/
│   │   ├── PublicProfileCard.tsx
│   │   └── CredentialBadge.tsx           # self-attested display, not verification status
│   ├── availability/
│   │   ├── WeeklyScheduleEditor.tsx
│   │   └── DateOverrideDialog.tsx        # vacation blocks, one-off slots
│   ├── appointment/
│   │   ├── AppointmentCard.tsx
│   │   ├── RescheduleDialog.tsx
│   │   └── AppointmentStatusBadge.tsx
│   ├── timeline/
│   │   ├── TimelineFeed.tsx              # virtualized, paginated (NFR: Performance)
│   │   ├── TimelineEventCard.tsx         # discriminated union renderer
│   │   └── TimelineFilterBar.tsx
│   ├── session/
│   │   ├── AudioRecorder.tsx             # chunked upload, crash recovery
│   │   ├── ConsentToggle.tsx             # FR/Edge Case #11
│   │   ├── NotesEditor.tsx
│   │   └── DocumentUploader.tsx
│   ├── commitment-task/
│   │   ├── CommitmentCard.tsx
│   │   ├── TaskCard.tsx
│   │   └── DueDateBadge.tsx
│   ├── ai/
│   │   ├── ChatWindow.tsx
│   │   ├── CitationPill.tsx              # links back to source Interaction
│   │   ├── RecapCard.tsx
│   │   └── FeedbackButtons.tsx           # thumbs up/down (FR26)
│   ├── payment/
│   │   └── PayoutLedgerTable.tsx
│   └── settings/
│       ├── TeamInviteForm.tsx
│       ├── OrgAdminTable.tsx
│       └── AuditLogTable.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   ├── useRealtime.ts                    # Supabase Realtime subscription hook
│   ├── useTimeline.ts
│   ├── useCases.ts
│   └── useAppointments.ts
│
├── lib/
│   ├── api.ts                            # Axios instance
│   ├── supabase-client.ts                # Supabase browser client
│   ├── types.ts                          # Shared types (generated from Prisma)
│   ├── utils.ts
│   ├── timezone.ts                       # UTC storage, zone-labeled display
│   └── constants.ts
│
├── store/
│   ├── useAuthStore.ts
│   ├── useUIStore.ts
│   └── useNotifStore.ts
│
├── middleware.ts                          # role/route protection
└── public/
```

### 2.3 Rendering Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| Landing page | SSG | Marketing for this Consultant's practice |
| Public booking page (`/book`) | ISR (60s) | Near-fresh ratings/availability; no search index of multiple consultants |
| Dashboard, cases, timeline | CSR | Auth-gated, per-org, real-time updates |
| AI chat | CSR + streaming (SSE) | Token-by-token model output |
| Org settings (team, audit) | CSR | Auth-gated, Consultant or org Admin |
| Onboarding | SSR | Form-heavy, minimal client JS needed first paint |

### 2.4 State Management Strategy

```
Global State (Zustand):
  ├── Auth state (user, role, session)
  ├── Notification badge count
  └── UI state (dialogs, drawers, active recording state)

Server State (TanStack Query):
  ├── This instance's Consultant public profile (/book)
  ├── Case timeline (paginated, filtered, keyword-searched)
  ├── Appointments (per role)
  ├── Commitments/Tasks (dashboard widget, sortable)
  ├── AI chat history + streaming buffer
  └── Payment/payout ledger

Local Component State:
  ├── Form inputs
  ├── Recorder state (recording/paused/uploading)
  └── Dialog open/close
```

---

## 3. Backend Architecture

### 3.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS |
| Framework | NestJS (modular DI, testability at this domain complexity) |
| Language | TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 (Supabase, Mumbai region) with Prisma schema + Pinecone Vector DB |
| Auth | Supabase Auth + app-managed `public.users` sync |
| Cache / Rate Limit | Redis (Upstash, serverless-friendly) |
| Queue | BullMQ (backed by Redis) |
| Object Storage | Supabase Storage (S3-compatible buckets for audio/documents) |
| Realtime | Supabase Realtime (Postgres logical replication → WS) |
| Transcription | Whisper AI with Hugging Face models (async transcribing) |
| AI / RAG | Provider-agnostic LLM client + Pinecone Vector Database similarity search |
| Payments | Razorpay (Orders + Webhooks) |
| Notifications | Twilio (SMS) + Resend (email service) + in-app |
| Validation | Zod (shared schemas between API and frontend) |
| Testing | Jest + Supertest |
| Logging | Pino + structured JSON → log aggregator |
| Monitoring | OpenTelemetry → Grafana/Tempo or DataDog APM |
| API Documentation | OpenAPI 3.1 (`@nestjs/swagger`) |
| Containerization | Docker |
| Orchestration | AWS ECS Fargate (or Fly.io for smaller scale) |

### 3.2 Directory Structure

```
apps/api/
├── src/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.ts               # Prisma client (pooled via PgBouncer)
│   │   ├── redis.ts
│   │   ├── supabase-storage.ts
│   │   ├── razorpay.ts
│   │   ├── twilio.ts
│   │   ├── whisper.ts
│   │   └── llm-provider.ts           # abstraction over LLM vendor (OpenAI/Anthropic/OpenRouter/Gemini)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Supabase JWT verification
│   │   ├── role.guard.ts             # CLIENT | CONSULTANT | ADMIN (org-scoped)
│   │   ├── case-scope.guard.ts       # asserts req.user has access to :caseId
│   │   ├── rate-limit.middleware.ts
│   │   ├── validate.pipe.ts          # Zod validation pipe
│   │   ├── upload.middleware.ts      # signed URL issuance, not proxying bytes
│   │   └── error.filter.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── consultants/
│   │   │   ├── consultants.controller.ts   # /consultants/me only — no public search/list
│   │   │   ├── consultants.service.ts
│   │   │   └── consultants.schema.ts
│   │   ├── clients/
│   │   │   └── guardian-linkage.service.ts # minors (Edge Case #38)
│   │   ├── availability/
│   │   │   ├── availability.service.ts
│   │   │   └── slot-lock.service.ts        # DB-level locking (Edge Case #1)
│   │   ├── appointments/
│   │   │   ├── appointments.service.ts
│   │   │   ├── reschedule.service.ts
│   │   │   └── no-show.service.ts
│   │   ├── cases/
│   │   │   ├── cases.service.ts
│   │   │   └── closure.service.ts          # open commitments/tasks check (Edge Case #22)
│   │   ├── interactions/
│   │   │   ├── interactions.service.ts
│   │   │   └── consent.service.ts          # Edge Case #11
│   │   ├── transcription/
│   │   │   ├── transcription.controller.ts # status polling endpoint
│   │   │   └── transcription.orchestrator.ts # enqueues job, doesn't call Whisper inline
│   │   ├── commitments/
│   │   ├── tasks/
│   │   ├── documents/
│   │   │   ├── documents.service.ts
│   │   │   ├── versioning.service.ts       # Edge Case #24
│   │   │   └── visibility.service.ts       # Edge Case #25
│   │   ├── timeline/
│   │   │   └── timeline-aggregator.service.ts  # merges Appointment/Interaction/Commitment/Task/Document
│   │   ├── ai/
│   │   │   ├── ai.controller.ts            # /ai/chat, /ai/recap, /ai/feedback
│   │   │   ├── rag-retrieval.service.ts    # hard-scoped by caseId at query layer
│   │   │   ├── embedding.service.ts
│   │   │   ├── summarization.service.ts    # hierarchical for large histories
│   │   │   └── guardrails.service.ts       # declines diagnostic/legal advice (FR27, Edge Case #29)
│   │   ├── notifications/
│   │   ├── payments/
│   │   │   ├── razorpay-webhook.controller.ts
│   │   │   ├── reconciliation.service.ts   # Edge Case #32
│   │   │   └── payout-ledger.service.ts
│   │   ├── reviews/
│   │   ├── org/
│   │   │   ├── org-admin.controller.ts     # invite/revoke org Admins
│   │   │   ├── dispute.controller.ts
│   │   │   └── audit-access.service.ts     # justified-access flow (Edge Case #41)
│   │
│   ├── workers/
│   │   ├── transcription.worker.ts
│   │   ├── embedding.worker.ts
│   │   ├── summarization.worker.ts
│   │   ├── notification.worker.ts
│   │   ├── reminder.worker.ts               # commitment/task due (FR19, FR20)
│   │   ├── appointment-expiry.worker.ts     # Edge Cases #4, #5
│   │   ├── no-show.worker.ts                # Edge Case #7
│   │   ├── document-scan.worker.ts
│   │   └── payout-reconciliation.worker.ts
│   │
│   ├── events/
│   │   ├── event-bus.ts                     # internal domain events
│   │   └── handlers/
│   │       ├── appointment.events.ts
│   │       ├── interaction.events.ts
│   │       └── commitment-task.events.ts
│   │
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── pagination.ts
│   │   ├── audit-logger.ts                  # writes to AuditLog on every sensitive read
│   │   ├── timezone-utils.ts                # UTC storage, DST-safe recurrence
│   │   └── llm-client.ts                    # LLMClient interface & factory
│   │
│   ├── llm/
│   │   ├── openai.client.ts
│   │   ├── anthropic.client.ts
│   │   ├── openrouter.client.ts
│   │   ├── gemini.client.ts
│   │   ├── resilient-client.ts              # fallback chain wrapper
│   │   └── embedding.service.ts             # Pinecone embedding generation
│   │
│   ├── types/
│   │   └── express.d.ts
│   │
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── rls-policies.sql                     # applied via migration, see §7.3
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── Dockerfile
└── docker-compose.yml
```

### 3.3 Layered Architecture Pattern

```
HTTP Request
    │
    ▼
[Router] — maps URL to controller
    │
    ▼
[Guard chain]
    ├── auth.guard (Supabase JWT verification)
    ├── role.guard (CLIENT | CONSULTANT | ADMIN)
    ├── case-scope.guard (does req.user own/belong to :caseId?)
    └── rate-limit.guard
    │
    ▼
[Validation pipe] — Zod schema
    │
    ▼
[Controller] — thin, delegates to service
    │
    ▼
[Service] — business logic, orchestrates DB + cache + queue + events
    │
    ▼
[Prisma ORM] — parameterized queries, always scoped by tenant key
    │
    ▼
[PostgreSQL] — RLS re-validates tenant scope at the row level (defense in depth)
```

### 3.4 Caching Strategy (Redis)

| Cache Key Pattern | TTL | Description |
|-------------------|-----|-------------|
| `org:consultant:profile` | 300s | This instance's single public Consultant profile (`/book`) |
| `org:consultant:rating` | 600s | Aggregate rating |
| `org:consultant:availability:{weekStart}` | 30s | Computed open slots (short TTL — booking-critical) |
| `case:{id}:timeline:page:{n}` | 15s | Timeline pages (invalidated aggressively on new event) |
| `rate:{ip}` / `rate:{userId}` | 60s | Rate limit counters |
| `session:blacklist:{jti}` | Until expiry | Revoked access tokens |
| `otp:{phone}:{purpose}` | 600s | OTP attempt counter |
| `ai:embedding-cache:{contentHash}` | 24h | Avoid re-embedding unchanged content |

Cache invalidation:
- Availability cache cleared on booking, cancellation, or availability edit (Edge Case #2, #8).
- Timeline cache cleared on any new Interaction, Commitment, Task, or Document for that `caseId`.
- Consultant rating cache cleared on new visible Review.
- **Never cache anything containing transcript text, notes, or documents** — these are always read live, scoped and audited.

---

## 4. Data Model Summary

Full entity definitions (User, ClientProfile, ConsultantProfile, Availability, Case, Appointment, Interaction, Commitment, Task, Document, AISummary, ChatMessage, Notification, Payment, Review, AuditLog) follow the PRD §6 schema exactly and map 1:1 to Prisma models. Key relational anchors:

```
User ──┬── ClientProfile ──┐
       └── ConsultantProfile ┴── Case (client × consultant, or client × consultant × matter)
                                     │
              ┌──────────────────────┼───────────────────────┬───────────────┐
              ▼                      ▼                        ▼               ▼
         Appointment            Interaction               Document      AISummary/ChatMessage
              │                      │
              └──────► Commitment ◄──┘
                       Task
```

Notable additions beyond the PRD's base schema, needed for production-grade correctness:

| Addition | Reason |
|---|---|
| `Availability.version` + optimistic lock | Prevents double-booking under concurrent writes (Edge Case #1) |
| `Case.matterKey` (nullable, unique with clientId+consultantId) | Supports multiple concurrent Cases per pair for distinct matters (Edge Case #37) |
| `Interaction.deletedAt` (soft delete) | Recovery window before hard delete (Edge Case #16); AISummary keeps a frozen snapshot reference, not a live FK, so summaries survive source deletion (Edge Case #31) |
| `Document.embeddingId` / `Interaction.embeddingId` | Pointers to Pinecone vector records for RAG retrieval |
| `AISummary.excludedFromRAG` (boolean) | Set true when flagged `NOT_HELPFUL`, so bad summaries never re-enter retrieval (Edge Case #27) |
| `AuditLog.justification` (nullable text) | Required when an org Admin accesses sensitive Case content during a dispute (Edge Case #41) |
| `OrgAdminInvite` (email, invitedBy, status, revokedAt) | Tracks staff admins invited by the Consultant; one org per deployment |
| `Payment.webhookReceivedAt` / `reconciledAt` | Drives the reconciliation worker (Edge Case #32) |

---

## 5. Booking & Concurrency Architecture

Booking correctness is a first-class concern per the PRD's edge cases, not an afterthought.

```
Client requests slot → POST /appointments
    │
    ▼
[Transaction, SERIALIZABLE isolation or SELECT ... FOR UPDATE on Availability row]
    ├── Check Availability.status == OPEN AND bookingsCount < maxBookingsPerSlot
    ├── If satisfied: create Appointment(REQUESTED), increment bookingsCount,
    │   mark Availability.status = BOOKED if maxBookingsPerSlot reached
    └── If not satisfied: rollback → 409 Conflict "slot no longer available"
    │
    ▼
Enqueue notification job → consultant notified of new request

[appointment-expiry.worker — cron, every 15 min]
    → Finds REQUESTED appointments older than consultant's response SLA
    → Auto-expires, notifies client to rebook (Edge Case #4)

[reschedule.service]
    → On RESCHEDULE_PROPOSED, starts an expiry timer (configurable window)
    → If client doesn't respond, auto-reverts to CANCELLED, both notified (Edge Case #5)

[no-show.worker — cron, every 5 min]
    → Finds APPROVED appointments past scheduledEnd + grace period with no
      "session started" event → marks NO_SHOW, allows dispute flag (Edge Case #7)

[availability edit after booking]
    → Editing/removing an Availability row that has active Appointments
      NEVER cascades a silent cancel; it opens a required reschedule/cancel
      workflow with mandatory client notification (Edge Case #2, #8)
```

All timestamps are stored in **UTC**; every UI surface renders with an explicit timezone label (Edge Case #6). Recurring weekly availability is expanded server-side per request using a DST-aware calendar library (`luxon`), never pre-materialized as naive local time (Edge Case #9).

---

## 6. Session Capture & Transcription Architecture

### 6.1 Audio Recording & Upload

```
Consultant clicks "Start Session" → Interaction(type=RECORDED_AUDIO, consentGiven=?) created
    │
    ▼
[ConsentToggle] — if consent explicitly denied, recording is disabled client-side
    and no audio path is offered for that Interaction (Edge Case #11)
    │
    ▼
Client → [Request presigned Supabase Storage upload URL] (per-chunk, every ~30s)
Client → [Direct upload each chunk to Storage] (bypasses API server)
    │
    ▼ (on stop, or on crash/reconnect — chunks already uploaded are preserved)
Client → POST /interactions/:id/finalize-recording
    → API verifies all chunks present in Storage, stitches chunk manifest
    → Marks Interaction.transcriptStatus = PENDING
    → Enqueues TranscriptionQ job
```

Partial capture (browser crash, network drop) still yields the chunks already uploaded; the consultant is shown "Partial recording captured" rather than silent data loss (Edge Case #12). Recordings over ~10 minutes are chunked automatically to bound per-request payload size and avoid timeout failures on long sessions (Edge Case #14).

### 6.2 Transcription Pipeline (Async, Queued)

```
[TranscriptionQ worker]
    → Downloads chunk manifest from Storage
    → For long recordings: submits chunks to Whisper in parallel,
      re-assembles transcript in chunk order with overlap-trimming
    → On success: Interaction.transcriptText set, transcriptStatus = COMPLETED
    → On low-confidence / failure: transcriptStatus = FAILED, consultant notified,
      original audio remains source of truth, manual note entry offered as fallback
      (Edge Case #13)
    → On success: enqueues EmbeddingQ job for the new transcript text
```

Multi-speaker diarization is explicitly out of scope for v1, matching the PRD's confirmed answer that only the consultant speaks during recording (Edge Case #15, PRD Open Question #5) — the pipeline assumes single-speaker audio and does not attempt speaker separation.

### 6.3 Notes & Documents

- Rich-text notes save independently of/alongside recordings (FR14), autosaved via debounced PATCH requests.
- Soft-delete with a recovery window (configurable, default 24h) applies to notes and recordings before hard delete (Edge Case #16).
- Sensitive verbal disclosures captured in transcripts inherit the same `visibility` and access controls as written notes — org Admins have no default access; dispute escalation requires a logged justification (Edge Case #17, §9.4).

---

## 7. Document Architecture

```
Client/Consultant → [Request presigned Supabase Storage URL, with allow-listed
                      MIME types and size limit enforced server-side before
                      URL issuance]
    │
    ▼
Client → [Direct upload to Storage] (bypasses API server)
    │
    ▼
Client → POST /documents/confirm { fileKey, caseId, category, accessLevel }
    → API validates object exists and matches expected size/type
    → Document record created, scanStatus = PENDING
    → Enqueues DocScanQ job
    │
    ▼
[DocScanQ worker]
    → Downloads from Storage, runs antivirus scan (e.g. ClamAV sidecar)
    → INFECTED: deletes object, marks scanStatus = INFECTED, uploader notified
    → CLEAN: marks scanStatus = CLEAN, document becomes visible per accessLevel
```

Storage bucket layout (per-case scoping enables simple RLS-backed access rules):

```
ayushman-storage/
├── verification/
│   └── {consultantId}/license.pdf         # original filename preserved for UI display
├── cases/
│   └── {caseId}/
│       ├── audio/{interactionId}/chunk-{n}.webm
│       ├── documents/{documentId}/v{version}/{fileName}
│       └── shared-summaries/{aiSummaryId}.json
└── profiles/
    └── {userId}/avatar.jpg
```

- **Versioning, not overwrite**: re-uploading a corrected document creates a new `Document` row linked via `previousVersionId`; the historical version stays byte-identical and immutable (Edge Case #24).
- **Explicit share confirmation**: flipping `accessLevel` from `PRIVATE_TO_CONSULTANT` to `SHARED_WITH_CLIENT` requires a confirmation dialog; un-sharing is supported but the UI discloses that already-viewed content can't be un-seen (Edge Case #25).
- **Quotas & lifecycle**: per-consultant storage quota tracked in `ConsultantProfile`; a scheduled job moves documents/audio untouched for >12 months to a colder Storage tier (Edge Case #26).
- **No third-party file retention beyond the platform's own bucket** — per PRD Open Question #2, there is no separate archival store; documents live only as long as the client keeps them in the platform-linked Supabase bucket, simplifying the deletion/retention story in §9.3.

---

## 8. AI Assistant / RAG (Phase 5 — Deferred)

> Per `phase_scope_ayush.md`, AI chat and RAG (PRD FR23–FR28) are **not part of the initial build**. No MVP phase depends on them.

When implemented in Phase 5, the design must follow these PRD constraints:

- **Hard-scoped retrieval** by `caseId` at the database/query layer (never prompt-only — Edge Case #28).
- **Pinecone** (or equivalent vector store) for case-scoped embeddings; ingestion runs async via `embedding-queue`.
- **Provider-agnostic LLM client** with optional fallback chain (OpenAI, Anthropic, OpenRouter, Gemini).
- **Citations required** on every AI output; summaries flagged `NOT_HELPFUL` are excluded from future RAG (Edge Case #27).
- **Guardrails** decline new medical/legal advice; summarize recorded human judgment only (FR27, Edge Case #29).
- **Client access**: view-only for consultant-shared summaries; no direct AI query against private notes (PRD Open Question #3).

Database tables (`ai_summaries`, `chat_messages`, `rag_citations`) are defined in `schema_ayushman.md` but are not migrated until Phase 5.

---

## 9. Security & Compliance

### 9.1 Authentication Flow

```
[Sign up / Login]
  → Supabase Auth: email/phone + OTP, or password
  → Issues access_token (JWT, short-lived) + refresh_token (HttpOnly, Secure cookie)
  → API verifies JWT signature + `role` claim on every request

[Authenticated Request]
  → Authorization: Bearer {access_token}
  → auth.middleware verifies signature + expiry
  → If expired: client calls token refresh; refresh_token rotated
  → If refresh expired: 401 → redirect to login

[Logout]
  → access_token JTI added to Redis blacklist until natural expiry
  → refresh_token invalidated
```

### 9.2 Row-Level Security (Postgres)

RLS is applied on every tenant-scoped table (`Case`, `Appointment`, `Interaction`, `Commitment`, `Task`, `Document`, `AISummary`, `ChatMessage`) as a **defense-in-depth layer beneath the application's own scoping**:

```sql
-- Example: Interaction table
-- Note: auth.uid() is the Supabase auth user id, not the app's users.id — policies
-- resolve it via the public.current_app_user_id() helper (see supabase-setup_ayushman.md)
CREATE POLICY case_isolation_select ON "Interaction"
  FOR SELECT
  USING (
    "caseId" IN (
      SELECT id FROM "Case"
      WHERE "clientId" = public.current_app_user_id() OR "consultantId" = public.current_app_user_id()
    )
  );
```

This guarantees that even a bug in application-layer query construction cannot leak one consultant's case data into another consultant's response (NFR: Data isolation).

### 9.3 Data Retention, Deletion & Legal Holds

Per the PRD's resolved Open Question #2, the platform does not maintain a separate archival store — documents/audio persist only as long as they remain in the platform-linked Supabase bucket. This simplifies deletion:

```
Client requests full data deletion ("right to be forgotten")
    │
    ▼
[Retention policy engine]
    ├── If Case category is MEDICAL/LEGAL and consultant has an active
    │   record-retention obligation: anonymize client-identifying fields
    │   (name, contact, DOB) on ClientProfile, but retain the clinical/legal
    │   record (transcripts, notes, documents) under a pseudonymous ID,
    │   per DPDP-compatible policy (Edge Case #40)
    └── Otherwise: hard-delete Storage objects + cascade-delete DB rows
    │
    ▼
Consultant account suspended/deleted while Cases are active
    → Client retains read access to their own historical timeline and
      documents; consultant's profile shows as "no longer active" rather
      than the Case being deleted (Edge Case #39)
```

### 9.4 Org Admin Access & Audit Logging

The `ADMIN` role represents **org staff** invited by the primary Consultant — not a platform operator. Org Admins share delegated operational access (appointments, calendar, client cases, disputes, payouts) scoped to this instance's single Consultant practice. They have **no default visibility into raw clinical/legal notes, transcripts, or documents** unless a dispute workflow explicitly grants time-boxed, justified access:

```
Org Admin opens a disputed Case (Consultant may also open directly)
    → UI requires a mandatory justification string tied to a Dispute ticket ID
    → audit-access.service writes AuditLog(action=ADMIN_VIEW_CASE, justification=...)
      BEFORE returning any sensitive content
    → Every subsequent read of that Case's Interactions/Documents by that
      Admin session is individually logged (Edge Case #41, FR36)

Consultant invites a new org Admin
    → POST /org/admins/invite { email }
    → Invitee completes signup with role=ADMIN (cannot claim CONSULTANT slot)
    → OrgAdminService links Admin to this org; Consultant can revoke at any time
```

Every access to sensitive records — by anyone, not just org Admin — writes to `AuditLog` (NFR: Auditability).

### 9.5 Credentials & Category Tiering (FR3, Edge Case #42)

Credential requirements vary by category but are **self-attested at registration** — there is no platform verification queue and no third-party approval gate:

```
Consultant onboarding collects category-specific credential fields:
  MEDICAL / LEGAL  → licenseNumber + licenseDocUrl (PDF, for public profile display)
  IT / PHYSIOTHERAPY / HOMEOPATHY → qualification proof upload
  ASTROLOGY         → identity verification fields only

Consultant record is active immediately after required profile fields are saved.
Publishing availability and being bookable is controlled by the Consultant's own
"Accept Bookings" toggle — not by an external VERIFIED status.
```

`ClientProfile` includes an `isMinor` flag computed dynamically from `dob`. When a client is a minor, the booking/profile flow requires linking to one or more guardians via the `guardian_links` table (defining relationship, parent/guardian user ID, and consent document url). Booking flows for Medical/Legal categories verify this linkage and consent status server-side at Appointment creation.

### 9.7 Defense Layers Summary

| Layer | Measure |
|-------|---------|
| Network | Cloudflare DDoS protection, WAF |
| TLS | HTTPS enforced, HSTS headers |
| CORS | Whitelist only known origins |
| Auth | Supabase JWT + refresh rotation |
| Tenant isolation | App-layer scoping + Postgres RLS (defense in depth) |
| Rate Limiting | Per-IP and per-user, Redis-backed |
| Input Validation | Zod schemas on all inputs |
| SQL Injection | Prisma parameterized queries |
| XSS | CSP headers, output escaping (esp. rendered transcript/notes) |
| CSRF | SameSite cookies |
| File Uploads | Type allow-list, size limit, AV scan before visibility |
| Secrets | Managed secrets store (no `.env` in prod) |
| Logging | No PII, no transcript/note content in logs |
| Org Admin Access | Justified-access flow on disputes + full audit trail; invite/revoke by Consultant |
| Data at rest | Storage SSE + Postgres column-level encryption for highly sensitive fields |
| Data in transit | TLS everywhere, including worker → Whisper/LLM provider calls |

---

## 10. Notifications Architecture

Given the PRD's explicit callout that many clients (older demographics in Astrology/Homeopathy) may not check the platform, notifications are **multi-channel with fallback**, not in-app-only (Edge Case #20).

```
Domain event (e.g. Commitment.status → MISSED)
    │
    ▼
NotificationService.dispatch(userId, type, relatedEntity)
    │
    ▼
[Per-user channel preferences] → fan out to enabled channels:
    ├── IN_APP   → write Notification row, push via Supabase Realtime
    ├── EMAIL    → enqueue EmailQ job (SES/Resend)
    ├── SMS      → enqueue SmsQ job (Twilio)
    └── PUSH     → enqueue PushQ job (Web Push VAPID)
    │
    ▼
Each worker updates Notification.status (SENT/FAILED) independently;
failed channels don't block other channels from delivering
```

### 10.1 Reminder & Deadline Jobs

```
[reminder.worker — cron, every 5 min]
  → Scans Commitment/Task where dueDate is within configurable lead time
    (e.g. 24h) and status not in (FULFILLED, DONE, CANCELLED)
  → Sends "due soon" notification, records in reminderSentAt[]
  → On dueDate passing uncompleted: status → MISSED/OVERDUE, notifies
    consultant, and (for consultant-made Commitments) notifies the client
    transparently that a promise was missed (Edge Case #18)
```

---

## 11. Payments Architecture (Razorpay)

```
[Booking / pay-on-booking mode]
Client confirms booking → API creates Razorpay Order → client completes
payment via Razorpay Checkout → Razorpay redirects + fires webhook

[Webhook handler — idempotent]
POST /payments/webhooks/razorpay
    → Verify signature
    → Upsert Payment by razorpayPaymentId (idempotency key)
    → On SUCCESS: Appointment.paymentStatus = PAID, status may auto-advance
      to APPROVED if consultant has auto-approve + pay-first configured
    → On FAILURE: Appointment stays UNPAID, client notified to retry

[reconciliation.worker — cron, every 15 min]
    → Finds Payments with status=CREATED older than N minutes with no
      webhook received → queries Razorpay API directly to reconcile
      (Edge Case #32 — avoids "paid but shows unpaid" drift)

[Refunds]
    → Cancellation before cutoff: automatic full refund via Razorpay API
    → Cancellation after session start: refund blocked per policy,
      Consultant or org Admin override path for genuine disputes (Edge Case #33)
    → Partial refund (late join, cut short): Consultant/org-Admin-mediated manual flow,
      not automated in v1 (Edge Case #35)

[Payouts]
    → PayoutLedger computed per consultant: gross fees − platform commission
    → If payoutAccountDetails missing/invalid: payout blocked, consultant
      notified, transaction record preserved (never dropped) (Edge Case #36)
```

Razorpay is India-only; the API rejects consultant/client payout or payment configuration outside supported currency/region with an explicit error, rather than silently failing (Edge Case #34, PRD Open Question is resolved as India-only for v1).

---

## 12. Real-Time Architecture

Ayushman does not require a bidirectional chat layer (no client↔consultant messaging in v1 scope) — real-time needs are limited to **status push**: appointment updates, notification badges, and commitment/task due alerts. This is served by **Supabase Realtime** (Postgres logical replication → WebSocket) rather than a bespoke Socket.io cluster, reducing operational surface:

```
Postgres row change (Appointment, Notification, Commitment, Task)
    │
    ▼
Supabase Realtime (WAL-based) → filtered by RLS policy per subscribing client
    │
    ▼
Browser subscription: channel `case:{caseId}` or `user:{userId}`
    → useRealtime() hook updates TanStack Query cache directly (no polling)
```

If a future version adds client↔consultant messaging or embedded video, a dedicated Socket.io/WebSocket gateway (as sketched in §1's Realtime Gateway box) can be introduced without touching the Core API.

---

## 13. Background Job Architecture

### 13.1 Queue Definitions (BullMQ on Redis)

```
Queues:
  transcription-queue        — Whisper AI transcription jobs (Hugging Face models), chunked for long audio
  embedding-queue            — generates/updates Pinecone embeddings on new content
  summarization-queue        — session recaps, full-case summaries (hierarchical)
  email-queue                — transactional email (Resend)
  sms-queue                  — Twilio SMS
  push-queue                 — Web Push notifications
  notification-queue         — creates in-app Notification records
  reminder-queue             — commitment/task due & overdue sweeps (cron)
  appointment-expiry-queue   — auto-expire unanswered requests/reschedules (cron)
  no-show-queue              — mark NO_SHOW after grace period (cron)
  doc-scan-queue             — antivirus scanning of uploaded documents
  payout-reconciliation-queue — Razorpay webhook/order reconciliation (cron)
  storage-lifecycle-queue    — cold-tier archival of stale documents (cron)
```

All queues use **exponential backoff retry with a dead-letter queue**; transcription and payment jobs specifically alert on-call after 3 failed attempts, since silent failure there directly causes the data-loss and payment-drift scenarios the PRD flags as edge cases.

### 13.2 Job Example — Commitment/Task Deadline Sweep

```
[reminder.worker, cron every 5 min]
  1. SELECT Commitments/Tasks WHERE dueDate BETWEEN now() AND now() + leadTime
     AND status NOT IN (terminal states) AND reminderSentAt does not
     already contain this lead-time bucket
  2. Enqueue notification-queue job per recipient (multi-channel, §10)
  3. SELECT Commitments/Tasks WHERE dueDate < now() AND status NOT IN
     (terminal states) → update status to MISSED/OVERDUE, enqueue
     notification-queue job
```

---

## 14. Infrastructure Architecture

```
Region: ap-south-1 (Mumbai) — data residency alignment with India's DPDP Act
                               and Razorpay's India-only operation

Managed Services:
  ├── Supabase (Postgres 16, Auth, Storage, Realtime) — Mumbai region
  ├── Pinecone — Dedicated Vector Database for semantic search embeddings
  ├── Upstash Redis — cache, rate limiting, BullMQ backing store
  └── Vercel — Next.js frontend hosting (Edge network, ISR)

Compute (containerized services):
  VPC
  ├── Public Subnets (2 AZs)
  │   └── ALB (Application Load Balancer)
  │
  ├── Private Subnets (2 AZs)
  │   ├── ECS Fargate — Core API (auto-scaling: 2–10 tasks)
  │   ├── ECS Fargate — AI/RAG service (auto-scaling: 1–6 tasks, isolated
  │   │                  from Core API so LLM latency/cost spikes don't
  │   │                  affect booking/payments)
  │   └── ECS Fargate — Worker service (queue consumers, 1–6 tasks)
  │
  └── (No dedicated data subnet — Postgres/Storage/Realtime are managed by
      Supabase; API connects over TLS via connection pooler / PgBouncer)

External Services:
  ├── Hugging Face Whisper API (transcription)
  ├── LLM provider (OpenAI/Anthropic/etc., abstracted behind llm-provider.ts)
  ├── Razorpay (payments)
  ├── Twilio (SMS/WhatsApp)
  ├── SES/Resend (email)
  ├── CloudWatch or Grafana Cloud (logs + alarms)
  ├── Secrets Manager (env secrets)
  └── Certificate Manager (SSL)

CDN:
  └── Cloudflare (DNS + CDN + WAF)

Monitoring:
  ├── OpenTelemetry traces → Grafana Tempo / DataDog APM
  ├── Sentry (frontend + backend error tracking)
  └── PagerDuty (on-call: transcription failures, payment reconciliation
      drift, queue depth breaches)
```

### 14.1 Auto-Scaling Policy

| Service | Min | Max | Scale Trigger |
|---------|-----|-----|---------------|
| Core API | 2 | 10 | CPU > 70% for 3 min |
| AI/RAG service | 1 | 6 | Concurrent LLM requests > 20/task, or p95 latency > 3s |
| Workers | 1 | 6 | Combined queue depth > 200 jobs |

### 14.2 Database Scaling Path

- **Read replica** for timeline-read paths as traffic grows, keeping writes (bookings, payments) on the primary for strict consistency.
- **Pinecone index tuning** (index scaling, distance metric tuning) as embedding volume grows past the low-hundreds-of-thousands of rows.
- **Partitioning** `AuditLog` and `ChatMessage` by month once retention windows are finalized, since these are the fastest-growing, append-only tables.

---

## 15. CI/CD Pipeline

```
Developer pushes to feature branch
    │
    ▼
GitHub Actions — PR Checks:
    ├── TypeScript compile check
    ├── ESLint + Prettier
    ├── Unit tests (Jest)
    ├── Integration tests (Supertest, ephemeral test DB with RLS applied)
    ├── Prisma schema drift check
    └── Security scan (npm audit, Snyk)

PR merged to main:
    │
    ▼
GitHub Actions — Staging Deploy:
    ├── Build Docker images (Core API, AI/RAG service, Workers)
    ├── Push to container registry
    ├── Deploy to ECS staging
    ├── Run Prisma migrations against staging Supabase project
    ├── Run smoke tests (booking flow, AI chat scoping test, payment sandbox)
    └── Notify Slack

Release tag created:
    │
    ▼
GitHub Actions — Production Deploy:
    ├── Blue-green deployment
    │   ├── Deploy new version to green
    │   ├── Run health checks
    │   ├── Shift traffic 10% → 50% → 100%
    │   └── Keep blue on standby for 30 min
    ├── Run DB migrations (prisma migrate deploy) — RLS policies versioned
    │   alongside schema migrations, never applied out-of-band
    ├── Cache bust (Cloudflare)
    └── Notify Slack + tracing deployment marker
```

---

## 16. Observability

### 16.1 Logging Standards

```typescript
// Pino logger format
{
  timestamp: "2026-07-01T10:30:00Z",
  level: "info",
  service: "core-api",
  traceId: "abc123",
  userId: "uuid",
  role: "CONSULTANT",
  method: "POST",
  path: "/appointments",
  statusCode: 201,
  duration: 45,
  message: "Appointment created",
  // NEVER: passwords, tokens, transcript text, note content, document
  // contents, or any raw clinical/legal PII
}
```

### 16.2 Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|----------------|
| Core API p95 latency | > 500ms |
| Core API error rate | > 1% |
| AI/RAG p95 latency | > 4s |
| DB connection pool usage | > 80% |
| Redis memory usage | > 80% |
| Queue depth (any queue) | > 300 jobs |
| Transcription failure rate | > 5% |
| Payment webhook lag (reconciliation drift) | > 15 min unreconciled |
| Failed notification delivery rate (any channel) | > 5% |
| RLS policy violation attempts (query denied by RLS) | > 0 — page on-call immediately |

### 16.3 Health Check Endpoints

```
GET /health                → { status: "ok", uptime: 1234 }
GET /health/db             → { postgres: "ok" }
GET /health/redis          → { redis: "ok" }
GET /health/queue          → { depth: 12, workers: 3, oldestJobAgeMs: 4200 }
GET /health/dependencies   → { whisper: "ok", llmProvider: "ok", razorpay: "ok" }
```

### 16.4 Audit Trail as a First-Class Observability Signal

Unlike a multi-consultant marketplace, `AuditLog` here is treated as an operational dashboard for the practice owner: org settings surfaces **rate of org Admin access to sensitive Cases**, **rate of flagged AI summaries**, and **rate of RLS denials**, since spikes in any of these indicate either a security issue or a UX problem worth investigating immediately.

---

## 17. Traceability to PRD Requirements

| PRD Section | Architecture Coverage |
|---|---|
| FR1–FR4 (Onboarding) | §1.0 product model, §2.2 onboarding routes, §9.5 self-attested credentials |
| FR5–FR10 (Direct Booking) | §2.3 `/book` rendering, §5 booking/concurrency architecture (no discovery/search) |
| FR11–FR16 (Session Logging) | §6 session capture & transcription |
| FR17–FR20 (Commitments & Tasks) | §10.1 reminder jobs, §13.2 deadline sweep |
| FR21–FR22 (Timeline) | §3.2 `timeline-aggregator.service`, caching in §3.4 |
| FR23–FR28 (AI/RAG) | §8 (Phase 5 deferred — design constraints only) |
| FR29–FR30 (Notifications) | §10 multi-channel notifications |
| FR31–FR34 (Payments) | §11 payments architecture |
| FR35–FR36 (Access Control & Org Admin) | §9.2 RLS, §9.4 org admin invite + justified access |
| NFRs (compliance, isolation, availability, performance, scalability, retention, auditability, localization) | §9 (security/compliance), §13 (async jobs), §14.2 (scaling path), §2.1 (i18n) |
| Edge Cases #1–42 | Inline references throughout §5–§13 (cited by number at point of relevance) |

### Explicitly out of architecture scope (v1)

- Consultant marketplace, discovery, search, or listing APIs/routes
- Platform Admin / cross-tenant verification queue
- Multi-consultant clinics (multiple Consultant identities per instance)
