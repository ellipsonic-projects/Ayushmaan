# Ayushman — Database Schema Documentation (Multi-Tenant Edition, Monorepo Stack)

**Version**: 3.0.0
**Database**: PostgreSQL 16 (Supabase)
**ORM**: Prisma, schema lives in `packages/db`, consumed only by `apps/api` (Express) — `apps/web` (Next.js) never opens a DB connection directly (`PRD_v3_nextjs_express.md` §7.2)
**Last Updated**: July 2026

> Derived fresh from `PRD_v3_nextjs_express.md` — §1 (Role & Tenancy Model), §1.2 (Data Isolation Strategy, now a two-layer model), §1.3 (Entities), §7 (Tech Stack & Architecture: monorepo, Supabase Auth). This is a ground-up rewrite for the v3 architecture, not an edit of the v2 schema: every table below was re-derived from the v3 PRD text. The **entity set is the same business domain as v2** (tenancy, consultants, clients, cases, bookings, grievances, referrals, etc.) because the PRD's product scope didn't change — only _how the app talks to the database_ changed. What's actually different from a v2-style schema:
>
> - **No `password_hash`, `otp_verifications`, or `refresh_tokens` tables.** PRD v3 §7.3 commits to Supabase Auth as the identity provider for both apps — password hashing, OTP delivery/verification, session issuance, and refresh-token rotation all live inside Supabase's own `auth` schema. Reintroducing those concerns in `public` would duplicate a system we've deliberately chosen not to build ourselves.
> - **Tenant/role claims are read from the verified JWT by `apps/api`, not looked up from a table on every request.** `public.users` still denormalizes `tenant_id` and `role` (needed for joins, indexes, and business queries), but the _authorization_ decision no longer depends on a `users` row being reachable — it depends on the JWT's `tenant_id`/`is_super_admin` claims, stamped once at sign-in by a Postgres Auth Hook (PRD §7.3), and set into the session via `SET LOCAL app.tenant_id` by `apps/api`'s tenant-scoping middleware (PRD §1.2, §5 Phase 0) before any query runs.
> - Every attribute below is justified inline with **why it exists**, not just what type it is — an attribute with no stated purpose was cut.

---

## 1. Entity Relationship Overview

```
auth.users (Supabase-managed: password/OTP/session/refresh — out of our schema)
     │  (1:1, via supabase_auth_user_id)
     ▼
public.users (tenant_id NULL only for SUPER_ADMIN; role denormalized for query convenience)
     │
     ├─(role=CLIENT)──► client_profiles ──► client_category_profiles
     │                        │             guardian_links (dependents/minors)
     │
     ├─(role=CONSULTANT)──► consultant_profiles ──┬──► consultant_verification_documents
     │                                             ├──► availability_slots
     │                                             └──► out_of_office_periods
     │
     └─(role=SUPER_ADMIN | TENANT_ADMIN)  (no dedicated profile table — tenant/platform staff act via `users` + `tenants` directly)

tenants ──► tenant_settings, tenant_billing

cases (client_id, consultant_id, tenant_id, tags[])
  ├──► appointment_series ──► appointments ──► payments
  ├──► interactions ──┬──► commitments (from commitment_templates)
  │                    └──► tasks ──► task_reminders
  ├──► documents (self-referencing versions)
  └──► chat_messages ──► ai_summaries ──► rag_citations

reviews (per appointment, incl. nps_score)
grievances (tenant_id = context only, never a Tenant Admin visibility boundary)
referrals (client → client)            consultant_referrals (consultant → consultant, same tenant)
consultant_analytics_snapshot (precomputed, feeds burnout/slot-suggestion features)
notifications ──► notification_preferences
audit_logs (every Super Admin cross-tenant read + every Tenant Admin escalated case view)
push_subscriptions
```

---

## 2. Design Principles

1. **`tenant_id` is denormalized onto every tenant-scoped table.** Not just `users` — it's on `cases`, `appointments`, `documents`, `payments`, `notifications`, `audit_logs`, everything. This exists so Postgres RLS policies can filter with a single column comparison instead of a join chain up to `tenants` on every row check — a join-based policy is both slower and harder to audit than `tenant_id = current_setting('app.tenant_id')::uuid`.

2. **RLS is the enforcement boundary, and it is fed by `apps/api`, not by anything a client can influence.** Per PRD §1.2/§7.3, the Supabase JWT's `tenant_id`/`is_super_admin` claims (stamped by a Postgres Auth Hook at sign-in — never editable by either app) are read by `apps/api`'s tenant-scoping middleware and pushed into the request's DB transaction via `SET LOCAL app.tenant_id = '<uuid>'` and `SET LOCAL app.is_super_admin = '<bool>'`. `apps/web` never sends a `tenantId` the database trusts — the subdomain it resolves in its own middleware is UI routing only.

3. **No table stores a password, OTP, or refresh token.** Those are Supabase Auth's job. `public.users.supabase_auth_user_id` is the only bridge to identity; everything else in `public.users` is business data (role, status, denormalized tenant) that the app actually queries and joins against.

4. **`Grievance.tenant_id` is metadata, never an access boundary** (PRD §4.2) — it's the one column that exists on a row specifically so the platform can filter/report by tenant, while being deliberately excluded from any Tenant-Admin-facing RLS policy.

5. **A Case, not a Client-Consultant pair, is the timeline anchor** — the same two people can have more than one concurrent `case` when the matters are genuinely distinct (e.g., a Legal case and a separate Medical case at a multi-category tenant, or two unrelated Legal matters).

6. **Soft-delete with a bounded recovery window** on rows a client/consultant might delete by mistake (`interactions`, `documents`); everything else that must survive for compliance (`audit_logs`, `grievances`) is simply never deleted by the app layer at all.

7. **Recurring bookings are a parent + children, not a recurrence rule baked into `appointments` itself** — `appointment_series` holds the rule, `appointments` holds each concrete occurrence, so a whole series can be approved/cancelled in one action while a single occurrence remains independently reschedulable.

8. **RAG citations are rows, not a JSON blob on the chat message** — this is what lets a citation link back to one specific `interaction_id`/`document_id` and lets the retrieval-service isolation rule (tenant_id **and** case_id, enforced in code, never in a prompt) be checked against real foreign keys instead of trusting whatever the LLM claims it retrieved.

---

## 3. Table Definitions

### 3.1 `tenants`

Root of the tenancy tree. Only a `SUPER_ADMIN` action creates a row here (self-serve signup is out of scope — PRD §6 Open Point #3).

```sql
CREATE TABLE tenants (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              CITEXT        UNIQUE NOT NULL,     -- {slug}.ayushman.app; CITEXT so "Acme" and "acme" can't both register
  custom_domain     CITEXT        UNIQUE,               -- optional white-label domain, resolved the same way as slug
  display_name      VARCHAR(200)  NOT NULL,
  logo_url          TEXT,
  theme_config      JSONB         NOT NULL DEFAULT '{}',  -- colors/fonts read by apps/web root layout; JSONB because the shape is UI-owned, not schema-owned
  status            tenant_status NOT NULL DEFAULT 'ACTIVE', -- checked by apps/web middleware AND apps/api's tenant middleware -- both must refuse a SUSPENDED tenant
  plan_tier         VARCHAR(50)   NOT NULL DEFAULT 'STANDARD',
  provisioned_by    UUID,          -- FK to users(id), added after 3.4 exists (avoids a circular table dependency)
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

CREATE INDEX idx_tenants_status ON tenants(status);
-- slug/custom_domain already indexed via their UNIQUE constraints; no separate index needed.
```

> Why no `is_super_admin_created` flag: every row in this table was, by construction (PRD §1.1), created by a Super Admin -- the column would be constant and carry no information.

---

### 3.2 `tenant_settings`

One row per tenant. Operational defaults that change how the booking/branding flow behaves for that tenant -- split from `tenants` so the identity row and the frequently-edited settings row don't compete for the same lock during onboarding.

```sql
CREATE TABLE tenant_settings (
  tenant_id             UUID          PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  default_currency      CHAR(3)       NOT NULL DEFAULT 'INR',
  payout_cycle          payout_cycle  NOT NULL DEFAULT 'WEEKLY',
  booking_cutoff_hours  SMALLINT      NOT NULL DEFAULT 2 CHECK (booking_cutoff_hours >= 0), -- how last-minute a booking can be
  auto_approve_bookings BOOLEAN       NOT NULL DEFAULT FALSE, -- tenant-wide default; a consultant can override their own (3.8)
  branding_colors       JSONB         NOT NULL DEFAULT '{}',
  supported_languages   TEXT[]       NOT NULL DEFAULT ARRAY['en'], -- drives the client-facing language toggle
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

> `tenant_id` as the primary key (not a separate surrogate `id`) because this table is genuinely 1:1 with `tenants` and nothing else will ever reference it.

---

### 3.3 `tenant_billing`

Platform-side commercial record -- what Ayushman charges the tenant, not what the tenant charges its clients (that's `payments`, §3.15).

```sql
CREATE TABLE tenant_billing (
  tenant_id                UUID                PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_name                VARCHAR(100)        NOT NULL,
  mrr                      NUMERIC(12,2)       NOT NULL DEFAULT 0 CHECK (mrr >= 0),
  status                   subscription_status NOT NULL DEFAULT 'TRIALING',
  renews_at                TIMESTAMPTZ,
  platform_commission_pct  NUMERIC(5,2)        NOT NULL DEFAULT 0 CHECK (platform_commission_pct BETWEEN 0 AND 100), -- drives payout calculation
  updated_at               TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

CREATE INDEX idx_tenant_billing_status ON tenant_billing(status); -- powers the platform dashboard's "past due" filter
```

---

### 3.4 `users`

Business identity, one row per human per tenant (or one tenant-less row for a Super Admin). Not where a password or session lives -- that's `auth.users`, managed entirely by Supabase Auth per PRD §7.3.

```sql
CREATE TABLE users (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_user_id  UUID          UNIQUE NOT NULL, -- logical FK to auth.users(id); the only identity bridge this table needs
  tenant_id              UUID          REFERENCES tenants(id), -- NULL only for SUPER_ADMIN
  role                   user_role     NOT NULL,           -- denormalized from the JWT claim so the app can join/filter by role without decoding a token
  email                  CITEXT        NOT NULL,           -- kept here too so business queries (invite lookup, admin search) don't hit the auth schema
  phone                  VARCHAR(20),
  account_status         account_status NOT NULL DEFAULT 'ACTIVE', -- app-level status; distinct from Supabase's own session validity
  last_login_at          TIMESTAMPTZ,     -- last time the Auth Hook fired; used for reporting, not authorization
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT super_admin_is_tenantless CHECK (
    (role = 'SUPER_ADMIN' AND tenant_id IS NULL) OR
    (role <> 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
  )
);

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'CONSULTANT', 'CLIENT');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- Flagged assumption (PRD §6 Open Point #2, still unresolved): a Client identity does NOT span
-- tenants -- each tenant signup is its own `users` row, so uniqueness is scoped per tenant.
CREATE UNIQUE INDEX uniq_users_tenant_email ON users(tenant_id, email) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_users_super_admin_email ON users(email) WHERE tenant_id IS NULL;
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role); -- the single most common filter: "all CONSULTANTs in this tenant"

ALTER TABLE tenants ADD CONSTRAINT fk_tenants_provisioned_by
  FOREIGN KEY (provisioned_by) REFERENCES users(id);
```

> **Flagged assumption (PRD §6 Open Point #1, still unresolved):** `role` stays a single enum, so a person who is both `TENANT_ADMIN` and a practicing `CONSULTANT` needs two `users` rows sharing a tenant.

> **What used to be `otp_verifications` and `refresh_tokens` in a custom-auth design doesn't exist here.** Supabase Auth issues and rotates its own session/refresh tokens and handles OTP against `auth.users`; `apps/api` only ever verifies the resulting access token.

---

### 3.5 `client_profiles`

One-to-one with `users` where `role = 'CLIENT'`. Split from `users` because it's client-only data that grows independently of login concerns.

```sql
CREATE TABLE client_profiles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID          NOT NULL REFERENCES tenants(id),
  user_id                 UUID          UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name               VARCHAR(200)  NOT NULL,
  dob                     DATE,          -- drives is_minor below; also relevant to category intake
  is_minor                BOOLEAN GENERATED ALWAYS AS (dob IS NOT NULL AND dob > CURRENT_DATE - INTERVAL '18 years') STORED,
  preferred_language      VARCHAR(50)   NOT NULL DEFAULT 'en', -- drives the client-facing language toggle
  timezone                VARCHAR(50)   NOT NULL DEFAULT 'Asia/Kolkata',
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  referral_code           VARCHAR(20)   UNIQUE,  -- this client's own shareable code for the referral program (3.22)
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_profiles_tenant ON client_profiles(tenant_id);
CREATE INDEX idx_client_profiles_minor ON client_profiles(tenant_id, is_minor) WHERE is_minor = TRUE;
```

**Dependent/family profiles:** a dependent is just another `client_profiles` row, linked to the managing adult via `guardian_links` (§3.7) -- no separate `dependents` table.

---

### 3.6 `client_category_profiles`

Category-specific intake data -- kept off `client_profiles` so adding a new consultant category never requires an ALTER TABLE.

```sql
CREATE TABLE client_category_profiles (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID                NOT NULL REFERENCES tenants(id),
  client_id         UUID                NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category          consultant_category NOT NULL,
  data              JSONB               NOT NULL DEFAULT '{}', -- category-owned shape (medical: allergies/medications; legal: matter type)
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  UNIQUE (client_id, category)
);

CREATE INDEX idx_client_category_tenant ON client_category_profiles(tenant_id);
```

---

### 3.7 `guardian_links`

Connects a minor/dependent's `client_profiles` row to the adult who manages bookings/consent on their behalf.

```sql
CREATE TABLE guardian_links (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES tenants(id),
  minor_client_id  UUID          NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  guardian_user_id UUID          NOT NULL REFERENCES users(id),
  relationship     VARCHAR(50)   NOT NULL,  -- "parent", "legal guardian" -- free text since jurisdictions vary
  consent_given_at TIMESTAMPTZ,             -- NULL until the guardian explicitly consents; bookings blocked until set
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (minor_client_id, guardian_user_id)
);

CREATE INDEX idx_guardian_links_minor ON guardian_links(minor_client_id);
CREATE INDEX idx_guardian_links_guardian ON guardian_links(guardian_user_id);
```

---

### 3.8 `consultant_profiles`

One-to-one with `users` where `role = 'CONSULTANT'`, created **by** a `TENANT_ADMIN`.

```sql
CREATE TABLE consultant_profiles (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID                NOT NULL REFERENCES tenants(id),
  user_id                   UUID                UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by                UUID                REFERENCES users(id), -- which Tenant Admin created them; answers "who's responsible" in a dispute
  full_name                 VARCHAR(200)        NOT NULL,
  category                  consultant_category NOT NULL,
  sub_specialization        VARCHAR(150),
  bio                       TEXT,
  consultation_fee          NUMERIC(10,2)       NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  currency                  CHAR(3)             NOT NULL DEFAULT 'INR',
  languages_spoken          TEXT[]              NOT NULL DEFAULT ARRAY['en'], -- matched against client preferred_language for discovery
  is_accepting_new_clients  BOOLEAN             NOT NULL DEFAULT TRUE, -- the public "Accept Bookings" toggle
  auto_approve_bookings     BOOLEAN             NOT NULL DEFAULT FALSE, -- per-consultant override of the tenant default (3.2)
  rating_avg                NUMERIC(3,2)        NOT NULL DEFAULT 0.00, -- cached from reviews via trigger; avoids an AVG() scan on every profile view
  rating_count              INTEGER             NOT NULL DEFAULT 0,
  calendar_sync_token       UUID                NOT NULL DEFAULT gen_random_uuid(), -- unguessable token authorizing the outbound .ics feed without requiring login
  created_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TYPE consultant_category AS ENUM ('MEDICAL', 'LEGAL', 'IT', 'PHYSIOTHERAPY', 'HOMEOPATHY', 'ASTROLOGY');

CREATE INDEX idx_consultant_profiles_tenant ON consultant_profiles(tenant_id);
CREATE INDEX idx_consultant_public_lookup
  ON consultant_profiles(tenant_id, category, is_accepting_new_clients, rating_avg DESC)
  WHERE is_accepting_new_clients = TRUE; -- exactly the query the public /book page runs
```

---

### 3.9 `availability_slots`

Recurring weekly templates plus date-specific overrides. Booking conflicts are resolved against `appointments` (§3.12), not here.

```sql
CREATE TABLE availability_slots (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES tenants(id),
  consultant_id      UUID        NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  day_of_week        SMALLINT,   -- 0=Sunday..6=Saturday; NULL when specific_date is set
  specific_date      DATE,       -- one-off override (vacation block or extra slot); NULL when day_of_week is set
  start_time         TIME        NOT NULL,
  end_time           TIME        NOT NULL,
  slot_duration_mins SMALLINT    NOT NULL DEFAULT 30,
  status             slot_status NOT NULL DEFAULT 'OPEN',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT day_or_date CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

CREATE TYPE slot_status AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

CREATE INDEX idx_availability_consultant_open ON availability_slots(consultant_id, status) WHERE status = 'OPEN';
CREATE INDEX idx_availability_specific_date ON availability_slots(specific_date) WHERE specific_date IS NOT NULL;
```

> Times are stored as consultant-local `TIME` values, evaluated against the consultant's timezone at read time -- storing a fixed offset instead would silently break across a DST transition, which is what the "DST-safe recurring slot preview" build item depends on getting right.

---

### 3.10 `out_of_office_periods`

Pauses new bookings and auto-replies during travel/leave without touching every individual slot.

```sql
CREATE TABLE out_of_office_periods (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  consultant_id       UUID        NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  start_date          DATE        NOT NULL,
  end_date            DATE        NOT NULL,
  auto_reply_message  TEXT,
  pauses_new_bookings BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_ooo_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_ooo_consultant_range ON out_of_office_periods(consultant_id, start_date, end_date);
```

---

### 3.11 `cases`

The Client-Consultant relationship container and timeline anchor.

```sql
CREATE TABLE cases (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID                NOT NULL REFERENCES tenants(id),
  client_id     UUID                NOT NULL REFERENCES client_profiles(id),
  consultant_id UUID                NOT NULL REFERENCES consultant_profiles(id),
  category      consultant_category NOT NULL, -- copied from the consultant at case creation; doesn't change if the consultant later adds a sub-specialization
  matter_key    VARCHAR(150),        -- disambiguates two concurrent cases for the same pair (e.g. "knee" vs "shoulder")
  tags          TEXT[]              NOT NULL DEFAULT '{}', -- consultant's own CRM segmentation; per-consultant, never shared tenant-wide
  status        case_status         NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TYPE case_status AS ENUM ('ACTIVE', 'CLOSED');

CREATE INDEX idx_cases_tenant ON cases(tenant_id);
CREATE INDEX idx_cases_consultant ON cases(consultant_id, status); -- the consultant's client-list query, filtered to ACTIVE by default
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_tags ON cases USING GIN(tags); -- tag filter/bulk-message needs an array-contains search
```

---

### 3.12 `appointment_series` / `appointments`

A recurring booking is a rule (`appointment_series`) plus its concrete occurrences (`appointments`), so a whole series can be approved/cancelled together while a single occurrence stays independently editable.

New bookings go through a two-stage approval gate before they're confirmed: the Tenant Admin reviews a `REQUESTED` appointment first (approve/propose-reschedule/reject, checking the Consultant's availability), and only after Tenant Admin approval does it move to `ADMIN_APPROVED` for the Consultant to accept or reject. This is why `appointment_status` has a distinct `ADMIN_APPROVED` value between `REQUESTED` and `APPROVED` — see `Ayushman_data_api_v4.md` §11 for the full state machine and role table.

```sql
CREATE TABLE appointment_series (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID              NOT NULL REFERENCES tenants(id),
  case_id        UUID              NOT NULL REFERENCES cases(id),
  recurrence_rule JSONB            NOT NULL, -- {dayOfWeek, time, startDate, endDate | occurrenceCount} -- JSONB because the shape is a small, UI-owned rule, not a set of queryable columns
  status         series_status     NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TYPE series_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE INDEX idx_series_case ON appointment_series(case_id);

CREATE TABLE appointments (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID              NOT NULL REFERENCES tenants(id),
  case_id              UUID              NOT NULL REFERENCES cases(id),
  series_id            UUID              REFERENCES appointment_series(id), -- NULL for a one-off booking
  scheduled_start       TIMESTAMPTZ       NOT NULL,
  scheduled_end         TIMESTAMPTZ       NOT NULL,
  status               appointment_status NOT NULL DEFAULT 'REQUESTED',
  video_link           TEXT,             -- external Zoom/Meet link the consultant adds; surfaced in the "joining soon" push
  cancellation_reason  TEXT,
  created_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_appointment_range CHECK (scheduled_end > scheduled_start)
);

CREATE TYPE appointment_status AS ENUM ('REQUESTED', 'ADMIN_APPROVED', 'APPROVED', 'RESCHEDULE_PROPOSED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
-- REQUESTED: awaiting Tenant Admin review. ADMIN_APPROVED: Tenant Admin approved, forwarded to the Consultant's queue.
-- APPROVED: Consultant accepted — the only status that actually confirms the booking to the Client.

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_case ON appointments(case_id);
CREATE INDEX idx_appointments_series ON appointments(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_appointments_upcoming ON appointments(scheduled_start) WHERE status IN ('APPROVED', 'ADMIN_APPROVED', 'REQUESTED'); -- powers both the morning briefing and the join-reminder cron, plus the Tenant Admin/Consultant pending-approval queues
```

> `no_show`/`cancelled` counts against a time slot are read from this table directly (grouped by hour-of-day) to feed the "smart slot suggestions" feature — no separate log is needed since `appointments` already is the event history.

---

### 3.13 `interactions`

The logged record of what actually happened in a session — the core value proposition. Soft-deletable, since a consultant mis-logging a note shouldn't be unrecoverable.

```sql
CREATE TABLE interactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES tenants(id),
  case_id          UUID          NOT NULL REFERENCES cases(id),
  appointment_id   UUID          REFERENCES appointments(id), -- NULL for an ad-hoc note logged between sessions (e.g. after a click-to-call)
  interaction_type interaction_type NOT NULL,
  notes            TEXT,
  transcription_status transcription_status, -- NULL unless audio was recorded; tracks the async Whisper job
  is_client_visible BOOLEAN      NOT NULL DEFAULT FALSE, -- gate for what a Client sees in their own timeline; private clinical notes default to FALSE
  deleted_at       TIMESTAMPTZ,  -- soft-delete; hard-deleted 30 days later per the retention policy (§5)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TYPE interaction_type AS ENUM ('SESSION_NOTE', 'AD_HOC_NOTE', 'CALL_LOG', 'MESSAGE_LOG');
CREATE TYPE transcription_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

CREATE INDEX idx_interactions_case ON interactions(case_id, created_at DESC) WHERE deleted_at IS NULL; -- the timeline feed's exact query shape
```

---

### 3.14 `commitment_templates` / `commitments`

Templates are the reusable library ("do these 3 stretches daily"); commitments are a specific instance assigned to a specific case.

```sql
CREATE TABLE commitment_templates (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID                NOT NULL REFERENCES tenants(id),
  consultant_id UUID                NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE, -- per-consultant library, not tenant-shared -- each professional's phrasing/protocol differs
  category      consultant_category NOT NULL,
  title         VARCHAR(200)        NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commitment_templates_consultant ON commitment_templates(consultant_id);

CREATE TABLE commitments (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID              NOT NULL REFERENCES tenants(id),
  case_id      UUID              NOT NULL REFERENCES cases(id),
  interaction_id UUID            REFERENCES interactions(id), -- the session this was created during, if any
  template_id  UUID              REFERENCES commitment_templates(id), -- NULL if typed fresh rather than picked from the library
  title        VARCHAR(200)      NOT NULL,
  description  TEXT,
  status       commitment_status NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TYPE commitment_status AS ENUM ('ACTIVE', 'COMPLETED', 'DISCONTINUED');

CREATE INDEX idx_commitments_case ON commitments(case_id);
```

---

### 3.15 `tasks` / `task_reminders`

A `task` is a discrete to-do with a due date (distinct from an ongoing `commitment`); `task_reminders` decouples "when to nudge" from the task itself so multiple reminder lead-times can exist per task.

```sql
CREATE TABLE tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  case_id     UUID        NOT NULL REFERENCES cases(id),
  assigned_to task_assignee NOT NULL, -- who is expected to act -- drives which dashboard ("my tasks" vs the consultant's overdue list) it surfaces on
  title       VARCHAR(200) NOT NULL,
  due_at      TIMESTAMPTZ,
  status      task_status NOT NULL DEFAULT 'OPEN',
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE task_assignee AS ENUM ('CLIENT', 'CONSULTANT');
CREATE TYPE task_status AS ENUM ('OPEN', 'COMPLETED', 'OVERDUE');

CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE status = 'OPEN'; -- overdue-sweep cron's exact filter

CREATE TABLE task_reminders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  lead_time_mins INTEGER  NOT NULL, -- how long before due_at to fire
  sent_at     TIMESTAMPTZ           -- NULL until the cron job sends it; prevents duplicate sends on retry
);

CREATE INDEX idx_task_reminders_unsent ON task_reminders(task_id) WHERE sent_at IS NULL;
```

---

### 3.16 `documents`

Metadata for files stored in Supabase Storage; append-only versioning via self-reference rather than overwrite, so a superseded version is never silently lost.

```sql
CREATE TABLE documents (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id),
  case_id           UUID          NOT NULL REFERENCES cases(id),
  interaction_id    UUID          REFERENCES interactions(id),
  previous_version_id UUID        REFERENCES documents(id), -- self-reference; NULL for the first version of a document
  storage_path      TEXT          NOT NULL, -- {tenantId}/{caseId}/... prefix, matching the Storage isolation rule
  file_name         VARCHAR(255)  NOT NULL,
  is_client_visible BOOLEAN       NOT NULL DEFAULT FALSE, -- visibility toggle at upload time (client-shared vs. private)
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id) WHERE deleted_at IS NULL;
```

---

### 3.17 `chat_messages` / `ai_summaries` / `rag_citations`

Case-scoped AI chat. Citations are normalized rows (not JSON) precisely so retrieval isolation can be checked against real foreign keys.

```sql
CREATE TABLE chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id),
  case_id    UUID        NOT NULL REFERENCES cases(id),
  sender     chat_sender NOT NULL,
  content    TEXT        NOT NULL,
  feedback   SMALLINT,   -- +1/-1 thumbs, NULL if not rated -- the only signal for RAG quality tracking this schema needs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE chat_sender AS ENUM ('CLIENT', 'CONSULTANT', 'AI');

CREATE INDEX idx_chat_messages_case ON chat_messages(case_id, created_at);

CREATE TABLE ai_summaries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  case_id           UUID        NOT NULL REFERENCES cases(id),
  appointment_id    UUID        REFERENCES appointments(id), -- which session this recap is "generate session recap" for
  content           TEXT        NOT NULL,
  is_client_visible BOOLEAN     NOT NULL DEFAULT FALSE, -- only shared summaries are ever queryable by a Client
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_summaries_case ON ai_summaries(case_id);

CREATE TABLE rag_citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  ai_summary_id   UUID REFERENCES ai_summaries(id) ON DELETE CASCADE,
  interaction_id  UUID REFERENCES interactions(id),  -- the source row a citation links back to
  document_id     UUID REFERENCES documents(id),

  CONSTRAINT citation_has_one_owner CHECK (
    (chat_message_id IS NOT NULL)::int + (ai_summary_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT citation_has_one_source CHECK (
    (interaction_id IS NOT NULL)::int + (document_id IS NOT NULL)::int = 1
  )
);
```

---

### 3.18 `reviews`

Post-session feedback, tied to the specific appointment being reviewed (not the case as a whole, since fee/quality perception can vary session to session).

```sql
CREATE TABLE reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id),
  appointment_id UUID        UNIQUE NOT NULL REFERENCES appointments(id), -- one review per appointment
  rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  nps_score      SMALLINT    CHECK (nps_score BETWEEN 0 AND 10), -- nullable: the star rating is mandatory, NPS is an additional richer signal
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_tenant ON reviews(tenant_id);
-- A trigger (AFTER INSERT) recomputes consultant_profiles.rating_avg/rating_count -- kept as a trigger,
-- not app logic, so the cached average can never drift out of sync with the underlying reviews.
```

---

### 3.19 `grievances`

A platform-level channel that bypasses the tenant entirely — `tenant_id` is stored for the Super Admin's own filtering, never for granting the tenant admin visibility (PRD §4).

```sql
CREATE TABLE grievances (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID              NOT NULL REFERENCES tenants(id), -- context only -- see RLS note in §4
  client_id              UUID              NOT NULL REFERENCES client_profiles(id),
  subject_type           grievance_subject NOT NULL,
  subject_consultant_id  UUID              REFERENCES consultant_profiles(id),
  case_id                UUID              REFERENCES cases(id),
  category               grievance_category NOT NULL,
  description            TEXT              NOT NULL,
  attachment_urls        TEXT[]            NOT NULL DEFAULT '{}',
  severity               grievance_severity NOT NULL DEFAULT 'LOW',
  status                 grievance_status  NOT NULL DEFAULT 'OPEN',
  assigned_to_super_admin_id UUID          REFERENCES users(id),
  resolution_notes       TEXT,
  resolved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TYPE grievance_subject AS ENUM ('CONSULTANT', 'TENANT_ADMIN', 'BILLING', 'PLATFORM', 'OTHER');
CREATE TYPE grievance_category AS ENUM ('SERVICE_QUALITY', 'MISCONDUCT', 'BILLING_DISPUTE', 'DATA_PRIVACY', 'OTHER');
CREATE TYPE grievance_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE grievance_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE INDEX idx_grievances_client ON grievances(client_id); -- the client's own "my submissions" view
CREATE INDEX idx_grievances_status ON grievances(status, severity); -- the Super Admin global triage queue
-- Deliberately NO index shaped like (tenant_id, ...) for tenant-admin consumption -- see §4.5.
```

---

### 3.20 `consultant_analytics_snapshot`

Precomputed daily/weekly aggregates so the dashboard's burnout indicator and analytics page never scan raw `appointments`/`tasks` history live.

```sql
CREATE TABLE consultant_analytics_snapshot (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES tenants(id),
  consultant_id          UUID        NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  snapshot_date          DATE        NOT NULL,
  booked_hours           NUMERIC(6,2) NOT NULL DEFAULT 0,
  overdue_commitment_count INTEGER   NOT NULL DEFAULT 0,
  cancellation_rate      NUMERIC(4,3) NOT NULL DEFAULT 0, -- feeds "smart slot suggestions"
  repeat_booking_rate     NUMERIC(4,3) NOT NULL DEFAULT 0, -- feeds the analytics/retention page
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (consultant_id, snapshot_date)
);

CREATE INDEX idx_analytics_snapshot_consultant_date ON consultant_analytics_snapshot(consultant_id, snapshot_date DESC);
```

---

### 3.21 `referrals` / `consultant_referrals`

Two distinct referral mechanics: a client inviting another client (growth), and a consultant handing a client sideways to a colleague within the same tenant (continuity of care).

```sql
CREATE TABLE referrals (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID           NOT NULL REFERENCES tenants(id),
  consultant_id       UUID           NOT NULL REFERENCES consultant_profiles(id), -- which practice the reward is scoped to
  referring_client_id UUID           NOT NULL REFERENCES client_profiles(id),
  referred_client_id  UUID           REFERENCES client_profiles(id), -- NULL until the invitee actually signs up
  reward_type         reward_type    NOT NULL DEFAULT 'NONE',
  reward_status       reward_status  NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TYPE reward_type AS ENUM ('DISCOUNT_CODE', 'CREDIT', 'NONE');
CREATE TYPE reward_status AS ENUM ('PENDING', 'GRANTED');

CREATE INDEX idx_referrals_referring_client ON referrals(referring_client_id);

CREATE TABLE consultant_referrals (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID              NOT NULL REFERENCES tenants(id),
  from_consultant_id  UUID              NOT NULL REFERENCES consultant_profiles(id),
  to_consultant_id    UUID              NOT NULL REFERENCES consultant_profiles(id),
  client_id           UUID              NOT NULL REFERENCES client_profiles(id),
  source_case_id      UUID              NOT NULL REFERENCES cases(id),
  context_note        TEXT,             -- carried-over summary only, never the raw private notes unless explicitly shared
  status              referral_status   NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_referral CHECK (from_consultant_id <> to_consultant_id)
);

CREATE TYPE referral_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE INDEX idx_consultant_referrals_to ON consultant_referrals(to_consultant_id, status); -- the incoming referral queue
```

---

### 3.22 `notifications` / `notification_preferences`

`notifications` is the outbound event log; `notification_preferences` is per-user opt-in/channel/lead-time config, kept separate because preferences are edited far less often than notifications are created.

```sql
CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID              NOT NULL REFERENCES tenants(id),
  user_id    UUID              NOT NULL REFERENCES users(id),
  type       notification_type NOT NULL,
  channel    notification_channel NOT NULL,
  payload    JSONB             NOT NULL DEFAULT '{}', -- rendering data (e.g. appointment time, video link) -- shape varies per type
  sent_at    TIMESTAMPTZ,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM (
  'APPOINTMENT_REMINDER', 'TASK_DUE', 'GRIEVANCE_SUBMITTED', 'GRIEVANCE_STATUS_CHANGED', 'SESSION_JOINING_SOON'
);
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE notification_preferences (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  channel      notification_channel NOT NULL,
  lead_time_mins INTEGER,        -- how far ahead of a due-soon event to alert; NULL = no lead-time concept for this type
  enabled      BOOLEAN           NOT NULL DEFAULT TRUE,

  UNIQUE (user_id, type, channel)
);
```

---

### 3.23 `audit_logs`

Every escalated or cross-tenant read, per PRD §1.2 — "unrestricted ≠ invisible."

```sql
CREATE TABLE audit_logs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES tenants(id), -- the tenant whose data was accessed, even for a cross-tenant Super Admin read
  actor_user_id          UUID        NOT NULL REFERENCES users(id),
  actor_role             user_role   NOT NULL, -- denormalized so a Super Admin's own role change later doesn't rewrite history
  is_cross_tenant_access BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE only for a Super Admin reading a tenant they don't operate
  action                 VARCHAR(100) NOT NULL,
  entity_type            VARCHAR(100) NOT NULL,
  entity_id              UUID,
  reason                 TEXT,       -- mandatory (enforced at the API layer) for anything beyond the tenant list/billing dashboard
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_cross_tenant ON audit_logs(is_cross_tenant_access) WHERE is_cross_tenant_access = TRUE; -- "who looked at our data" answer for a specific tenant
```

---

### 3.24 `push_subscriptions`

Web-push endpoint registrations, separate from `notification_preferences` because a device subscription is a technical credential, not a user preference.

```sql
CREATE TABLE push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  keys       JSONB       NOT NULL, -- {p256dh, auth} per the Web Push spec -- opaque to the app, required verbatim by the push service
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

---

### 3.25 `consultant_verification_documents`

Self-attested license/ID uploads, displayed on the public profile — there is deliberately no platform approval workflow. **Deliberately placed last in the build order**: a consultant is fully bookable and can operate end-to-end without ever uploading a document here, so this table is scheduled for the last development phase rather than alongside profile/onboarding — nothing else in the schema depends on a row existing here.

```sql
CREATE TABLE consultant_verification_documents (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID                  NOT NULL REFERENCES tenants(id),
  consultant_id     UUID                  NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  document_type     verification_doc_type NOT NULL,
  file_url          TEXT                  NOT NULL, -- Supabase Storage path, prefixed {tenantId}/{consultantId}/...
  issuing_authority VARCHAR(255),
  expiry_date       DATE,     -- surfaces a renewal reminder; not enforced as a booking gate
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TYPE verification_doc_type AS ENUM (
  'MEDICAL_LICENSE', 'BAR_REGISTRATION', 'DEGREE_CERTIFICATE', 'GOVERNMENT_ID', 'PROFESSIONAL_CERTIFICATE', 'OTHER'
);

CREATE INDEX idx_verification_docs_consultant ON consultant_verification_documents(consultant_id);
CREATE INDEX idx_verification_docs_expiry ON consultant_verification_documents(expiry_date) WHERE expiry_date IS NOT NULL;
```

---

### 3.26 `payments`

Client-facing payment record for a session — what a client pays the tenant/consultant (distinct from `tenant_billing`, §3.3, which is what Ayushman charges the tenant). Referenced by the ERD in §1 (`appointments ──► payments`) but previously undefined here; this definition matches the actual `packages/db/prisma/schema.prisma` `Payment` model (`Ayushman_data_api_v4.md` §24) — Stripe, not Razorpay, is the payment provider actually integrated.

```sql
CREATE TABLE payments (
  id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID            NOT NULL REFERENCES tenants(id),
  appointment_id           UUID            NOT NULL REFERENCES appointments(id),
  client_id                UUID            NOT NULL REFERENCES client_profiles(id),
  stripe_payment_intent_id TEXT            UNIQUE NOT NULL, -- Stripe's own id for this charge attempt; the join key the webhook handler updates against
  stripe_customer_id       TEXT,           -- NULL until the client's first successful checkout creates one
  amount                   NUMERIC(10,2)   NOT NULL,
  currency                 CHAR(3)         NOT NULL DEFAULT 'INR',
  status                   payment_status  NOT NULL DEFAULT 'REQUIRES_PAYMENT_METHOD',
  created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TYPE payment_status AS ENUM (
  'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION',
  'PROCESSING', 'REQUIRES_CAPTURE', 'CANCELED', 'SUCCEEDED', 'REFUNDED'
); -- mirrors the Stripe PaymentIntent lifecycle plus REFUNDED, set by the charge.refunded webhook

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_client ON payments(client_id);
```

> Why `appointment_id` not nullable / no `appointment_series_id` column: the API doc's checkout endpoint (`POST /tenants/:tenantId/appointments/:appointmentId/checkout`) is per-appointment even when "covering a series upfront" — that flow creates one `payments` row per occurrence rather than a series-level row, so no separate series FK exists.

---

## 4. Row-Level Security

### 4.1 The standard tenant-scoped policy (applied to every table listed in §3 except `grievances`)

```sql
-- Applied per-table, substituting the table name. Shown once here rather than repeated 25 times.
CREATE POLICY tenant_isolation ON <table_name>
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );
```

`app.tenant_id` and `app.is_super_admin` are set once per request by `apps/api`'s tenant-scoping middleware, inside the same DB transaction as the query — via `SET LOCAL`, which means the setting cannot leak between requests even on a pooled connection (PRD §1.2, §7.3).

### 4.2 Private clinical/legal notes — Tenant Admin gets no standing policy

Per the permission matrix (PRD §1.4), a Tenant Admin's access to private notes is "logged escalation only," not a standing grant. `interactions.notes` where `is_client_visible = FALSE` has no RLS branch for `TENANT_ADMIN` at all — instead, `apps/api` exposes a single stored procedure:

```sql
CREATE OR REPLACE FUNCTION tenant_admin_view_case(p_case_id UUID, p_reason TEXT)
RETURNS SETOF cases AS $$
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required for escalated case access';
  END IF;

  INSERT INTO audit_logs (tenant_id, actor_user_id, actor_role, is_cross_tenant_access, action, entity_type, entity_id, reason)
  VALUES (current_setting('app.tenant_id')::uuid, current_setting('app.user_id')::uuid, 'TENANT_ADMIN', FALSE, 'VIEW_CASE_ESCALATED', 'cases', p_case_id, p_reason);

  RETURN QUERY SELECT * FROM cases WHERE id = p_case_id AND tenant_id = current_setting('app.tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

A `SECURITY DEFINER` function, not a relaxed policy, so escalated access is always logged and never accidentally granted by a future policy edit.

### 4.3 Grievances — the one table without the standard policy

```sql
CREATE POLICY grievance_client_own ON grievances
  FOR SELECT
  USING (client_id IN (SELECT id FROM client_profiles WHERE user_id = current_setting('app.user_id')::uuid));

CREATE POLICY grievance_client_submit ON grievances
  FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM client_profiles WHERE user_id = current_setting('app.user_id')::uuid));

CREATE POLICY grievance_super_admin_all ON grievances
  FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');

-- No policy exists for TENANT_ADMIN or CONSULTANT on this table, on purpose (PRD §4.2) --
-- tenant_id here is metadata for the Super Admin's own filtering, never an access boundary.
```

---

## 5. Data Retention

| Table                                       | Retention                                    | Why                                                                                             |
| ------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `tenants` (archived)                        | Indefinite                                   | Compliance + potential reinstatement; never hard-deleted                                        |
| `users`                                     | PII cleared 30 days after a deletion request | Matches typical data-portability/erasure SLAs                                                   |
| `interactions` / `documents` (soft-deleted) | 30-day recovery window, then hard delete     | Long enough to undo an accidental delete, short enough to honor an erasure request              |
| `chat_messages` / `ai_summaries`            | 2 years                                      | Long enough for care-continuity lookback; excluded from RAG ground truth if flagged low-quality |
| `grievances`                                | 7 years                                      | Platform compliance record; survives tenant archival since the subject may be the tenant itself |
| `audit_logs`                                | 7 years                                      | Compliance requirement                                                                          |
| `notifications`                             | 6 months                                     | Operational log, not a record of care                                                           |
| `consultant_analytics_snapshot`             | 13 months rolling                            | Enough for year-over-year comparison; older rows pruned weekly                                  |
| `push_subscriptions`                        | Deleted on push failure (410 Gone)           | A dead endpoint has no further use                                                              |

Note what's absent from this table versus a custom-auth design: no `otp_verifications`/`refresh_tokens` retention rows, because Supabase Auth owns and expires those internally.

---

## 6. Migration Strategy

- Schema lives in `packages/db` (Prisma schema + generated client); only `apps/api` imports it. `apps/web` has no Prisma dependency at all (PRD §7.2) — this is enforced by not adding `packages/db` to `apps/web`'s dependencies, not just by convention.
- Managed via Prisma Migrate in development, `prisma migrate deploy` in CI/CD.
- Zero-downtime pattern: add nullable columns first, backfill, then tighten constraints in a follow-up migration.
- `tenants.provisioned_by` is added via `ALTER TABLE` after `users` exists (§3.4), resolving the circular dependency between the two tables' first migration.
- Auth Hook logic (stamping `tenant_id`/`is_super_admin` onto the JWT) lives as a Postgres function managed alongside these migrations, not inside `apps/api` — it must run inside Supabase's auth pipeline, not application code.
- Resolving PRD §6 Open Point #1 (Tenant Admin/Consultant same login) or #2 (Client identity spanning tenants) are breaking changes to `users`' constraints and should be scheduled as dedicated migrations, not bundled with feature work.
