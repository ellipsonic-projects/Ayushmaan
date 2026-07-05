# Ayushman — Database Schema Documentation (Multi-Tenant Edition)

**Version**: 2.0.0
**Database**: PostgreSQL 16 (Supabase)
**ORM**: Prisma
**Last Updated**: July 2026

> Derived from `PRD_v2_multitenant.md` §1 (Role & Tenancy Model), §1.3 (New/Changed Entities), §2–§3 (Everyday-Life & Client Features), §4 (Grievance & Reporting System), §5 (Page-by-Page Build Plan), and §7 (Tech Stack). Table/column naming follows `snake_case` for SQL and maps 1:1 to Prisma's `camelCase` fields via `@map`. This version supersedes the single-tenant v1.0 schema in full — every tenant-scoped table below is a fresh design against the v2 PRD, not a patch of the old one.

---

## 1. Entity Relationship Overview

```
tenants ────────────────────────────────────────────────────────────────────────────┐
  │                                                                                   │
  ├── tenant_settings                                                                │
  ├── tenant_billing                                                                 │
  │                                                                                   │
  ▼                                                                                   │
users (tenant_id NULL only for SUPER_ADMIN) ─────────────────────────────────────────┤
  │                             │                             │                      │
  ▼ (as client)                 ▼ (as consultant)              ▼ (guardian)          │
client_profiles          consultant_profiles            guardian_links               │
  │                             │  │                                                 │
  │                             │  └── consultant_verification_documents             │
  │                             ├── availability_slots                              │
  │                             └── out_of_office_periods                           │
  │                                                                                   │
  └───────────┬─────────────────┘                                                    │
              ▼                                                                       │
            cases (+ tags[]) ──────────────────────────────────────────┐              │
              │            │                                          │              │
              │            └──► appointment_series ──► appointments   │              │
              ▼                                          │            │              │
        appointments ────────────────────────────────────┘            │              │
              │                                    ────► payments ────┤              │
              ▼                                                       │              │
        interactions ──┬──► commitments                    case_deletion_requests    │
              │         └──► tasks ──► task_reminders                                │
              ▼                                                                       │
          documents (self-referencing versions)                                      │
              │                                                                       │
              ▼                                                                       │
        ai_summaries ──► rag_citations ◄── chat_messages                             │
                                                                                        │
reviews (+ nps_score) ─────────────────────────────────────────────────────────────────┤
grievances (tenant_id for context only — NOT tenant-visible, see §5.6) ────────────────┤
referrals (client→client) / consultant_referrals (cross-consultant, same tenant) ──────┤
consultant_analytics_snapshot ──────────────────────────────────────────────────────────┤
notifications ──► notification_preferences                                            │
audit_logs (incl. cross-tenant Super Admin access log) ────────────────────────────────┤
push_subscriptions / otp_verifications / refresh_tokens (cross-cutting, ref users) ────┘
```

Design principles reflected below (see PRD v2 §1.2 Data Isolation Strategy, §1.3, §4):
- **`tenant_id` is denormalized onto every tenant-scoped table**, not just `users` — RLS policies never need a join to enforce isolation (PRD §1.2).
- **Row-Level Security (RLS)** on every tenant-scoped table, keyed off `current_setting('app.tenant_id')` set from the JWT server-side per request — never a client-supplied header (PRD §1.2).
- **`SUPER_ADMIN` bypass is explicit and logged**, not implicit — a separate `is_super_admin` JWT claim is checked by policy, and every cross-tenant read by a Super Admin writes an `audit_logs` row (PRD §1.2, §1.4).
- **`Grievance.tenant_id` is context-only** — it is stored on the row but deliberately excluded from the RLS policy that would otherwise grant the Tenant Admin visibility (PRD §4.2). This is the one intentional exception to "tenants can see their own tenant's activity."
- **Case, not User-pair, is the timeline anchor** — a Client/Consultant pair may have multiple concurrent `cases`, each within one tenant.
- **Soft-delete + recovery window** on `interactions` and `documents` rather than hard delete.
- **Append-only versioning** on `documents`, never overwrite.
- **RAG citations are normalized rows**, not JSON blobs, and every retrieval-service query is hard-scoped by **both** `tenant_id` and `case_id` — enforced at the retrieval-service layer, never left to prompt instructions (PRD §1.2).
- **Recurring bookings** are modeled as a parent `appointment_series` with child `appointments`, so a whole series can be approved/cancelled together while individual occurrences remain independently editable (PRD §1.3).

---

## 2. Table Definitions

### 2.1 `tenants`

The top of the tenancy tree. Created only by `SUPER_ADMIN` (PRD §1.1, §1.4 — self-serve provisioning is explicitly out of scope for v2, per PRD §6 Open Point #3).

```sql
CREATE TABLE tenants (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                      VARCHAR(63)   UNIQUE NOT NULL,   -- subdomain: {slug}.ayushman.app
  custom_domain             VARCHAR(255)  UNIQUE,
  display_name              VARCHAR(200)  NOT NULL,
  logo_url                  TEXT,
  theme_config              JSONB         NOT NULL DEFAULT '{}',   -- branding colors/fonts consumed by root layout
  status                    tenant_status DEFAULT 'ACTIVE',
  plan_tier                 VARCHAR(50)   DEFAULT 'STANDARD',
  created_by_super_admin_id UUID,          -- FK to users(id) added via ALTER TABLE after §2.4 (avoids circular dependency: tenants → users → tenants)
  created_at                TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

-- Deferred FK (run after users table exists — see §2.4):
-- ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by
--   FOREIGN KEY (created_by_super_admin_id) REFERENCES users(id);
```

> `middleware.ts` resolves `{slug}` → `tenants.id` on every request and blocks `SUSPENDED`/unknown tenants with a branded unavailable page (PRD §5 Phase 0).

---

### 2.2 `tenant_settings`

One-to-one with `tenants`. Tenant-wide operational config (PRD §1.3).

```sql
CREATE TABLE tenant_settings (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  default_currency      VARCHAR(3)    DEFAULT 'INR',
  payout_cycle          payout_cycle  DEFAULT 'WEEKLY',
  booking_cutoff_hours  SMALLINT      NOT NULL DEFAULT 2 CHECK (booking_cutoff_hours >= 0),
  auto_approve_bookings BOOLEAN       DEFAULT FALSE,   -- tenant-level default; can be overridden per-consultant (see 2.7)
  branding_colors       JSONB         NOT NULL DEFAULT '{}',
  supported_languages   TEXT[]        NOT NULL DEFAULT ARRAY['en'],
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE payout_cycle AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);
```

---

### 2.3 `tenant_billing`

Platform-side subscription/commission record per tenant (PRD §1.3; consumed by `/(platform)/billing`).

```sql
CREATE TABLE tenant_billing (
  id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID                UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_name               VARCHAR(100)        NOT NULL,
  mrr                     NUMERIC(12,2)       NOT NULL DEFAULT 0 CHECK (mrr >= 0),
  status                  subscription_status DEFAULT 'TRIALING',
  renews_at               TIMESTAMPTZ,
  platform_commission_pct NUMERIC(5,2)        NOT NULL DEFAULT 0 CHECK (platform_commission_pct BETWEEN 0 AND 100),
  created_at              TIMESTAMPTZ         DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

CREATE INDEX idx_tenant_billing_tenant ON tenant_billing(tenant_id);
CREATE INDEX idx_tenant_billing_status ON tenant_billing(status);
```

---

### 2.4 `users`

Base authentication identity across all four roles. `tenant_id` is nullable **only** for `SUPER_ADMIN` (PRD §1.3).

```sql
CREATE TABLE users (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID           REFERENCES tenants(id),   -- NULL only for SUPER_ADMIN
  supabase_auth_user_id UUID           UNIQUE,       -- maps to auth.users.id; JWT carries tenant_id + is_super_admin claims stamped via auth hook
  email                 VARCHAR(255)   NOT NULL,
  phone                 VARCHAR(20),
  phone_verified        BOOLEAN        DEFAULT FALSE,
  email_verified        BOOLEAN        DEFAULT FALSE,
  password_hash         TEXT,                          -- NULL for OAuth-only users
  auth_provider_id      VARCHAR(255),
  role                  user_role      NOT NULL,
  account_status        account_status DEFAULT 'ACTIVE',
  is_active             BOOLEAN        DEFAULT TRUE,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ    DEFAULT NOW(),
  updated_at             TIMESTAMPTZ    DEFAULT NOW(),

  CONSTRAINT super_admin_is_tenantless CHECK (
    (role = 'SUPER_ADMIN' AND tenant_id IS NULL) OR
    (role != 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
  )
);

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'CONSULTANT', 'CLIENT');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- Flagged assumption (PRD §6 Open Point #2, unresolved as of this draft): schema assumes a
-- Client identity does NOT span tenants — each tenant signup is a distinct `users` row, so
-- email/phone uniqueness is scoped per-tenant rather than global. If Open Point #2 is answered
-- the other way (one login, multiple tenant memberships), this becomes a `user_tenant_memberships`
-- join table instead and `users.tenant_id`/`role` move onto that join table.
CREATE UNIQUE INDEX uniq_users_tenant_email ON users(tenant_id, email) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_users_super_admin_email ON users(email) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uniq_users_tenant_phone ON users(tenant_id, phone) WHERE tenant_id IS NOT NULL AND phone IS NOT NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- Now safe to add (resolves the circular dependency from §2.1):
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by
  FOREIGN KEY (created_by_super_admin_id) REFERENCES users(id);
```

> **Flagged assumption (PRD §6 Open Point #1, unresolved):** `role` is modeled as a single enum, meaning a person who is both a `TENANT_ADMIN` and a practicing `CONSULTANT` needs two `users` rows (one per role) sharing the same `tenant_id` and a common `email`/`phone` on the human but distinct login records — or, more simply, a `TENANT_ADMIN` who also sees clients gets a `consultant_profiles` row linked to a *second* `users` row of role `CONSULTANT`. If Open Point #1 resolves toward "same login, both capabilities," `role` becomes a `role_flags` array/bitmask instead of a single enum, and this constraint set changes accordingly.

---

### 2.5 `otp_verifications`

Phone/email OTP for signup and login. Tenant-branded email templates are applied at the notification layer, not stored here.

```sql
CREATE TABLE otp_verifications (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         REFERENCES tenants(id),   -- NULL for platform-level (Super Admin) OTPs
  identifier  VARCHAR(255) NOT NULL,   -- phone or email
  otp_hash    TEXT         NOT NULL,
  purpose     otp_purpose  NOT NULL,
  attempts    SMALLINT     DEFAULT 0,
  verified    BOOLEAN      DEFAULT FALSE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TYPE otp_purpose AS ENUM ('REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE');

CREATE INDEX idx_otp_tenant_identifier ON otp_verifications(tenant_id, identifier);
-- TTL cleanup: DELETE FROM otp_verifications WHERE expires_at < NOW();
```

---

### 2.6 `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  device_hint  VARCHAR(255),
  ip_address   INET,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked      BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

### 2.7 `client_profiles`

One-to-one with `users` where `role = 'CLIENT'`.

```sql
CREATE TABLE client_profiles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID          NOT NULL REFERENCES tenants(id),
  user_id                 UUID          UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name               VARCHAR(200)  NOT NULL,
  dob                     DATE,
  is_minor                BOOLEAN       GENERATED ALWAYS AS (
                             dob IS NOT NULL AND dob > (CURRENT_DATE - INTERVAL '18 years')
                           ) STORED,
  gender                  VARCHAR(30),
  address_line            TEXT,
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  pincode                 VARCHAR(10),
  timezone                VARCHAR(50)   DEFAULT 'Asia/Kolkata',
  preferred_language      VARCHAR(50)   DEFAULT 'en',   -- drives client-facing language toggle (PRD §3.8)
  profile_photo_url       TEXT,
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  referral_code           VARCHAR(20)   UNIQUE,          -- this client's own shareable code (see 2.28 referrals)
  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_client_profiles_tenant ON client_profiles(tenant_id);
CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_minor ON client_profiles(tenant_id, is_minor) WHERE is_minor = TRUE;
```

**Dependent/family profiles (PRD §3.6):** a dependent is simply another `client_profiles` row whose `user_id` may point to a lightweight/guardian-managed `users` row, linked to the managing client via `guardian_links` (§2.9) with `relationship` set accordingly — no separate `dependents` table needed.

---

### 2.8 `client_category_profiles`

Conditional, category-specific fields (medical history, jurisdiction, etc.), stored per-category so the schema grows without migrations as categories/fields expand.

```sql
CREATE TABLE client_category_profiles (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID                 NOT NULL REFERENCES tenants(id),
  client_id   UUID                 NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category    consultant_category  NOT NULL,
  data        JSONB                NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW(),

  CONSTRAINT unique_client_category UNIQUE (client_id, category)
);

CREATE INDEX idx_client_category_profiles_tenant ON client_category_profiles(tenant_id);
CREATE INDEX idx_client_category_profiles_client ON client_category_profiles(client_id);
CREATE INDEX idx_client_category_profiles_data ON client_category_profiles USING GIN (data);
```

---

### 2.9 `guardian_links`

Guardian/parent linkage and consent for minor or dependent clients. A minor may have more than one guardian.

```sql
CREATE TABLE guardian_links (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id),
  minor_client_id       UUID          NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  guardian_user_id      UUID          NOT NULL REFERENCES users(id),
  relationship          VARCHAR(50)   NOT NULL,   -- e.g., "Mother", "Legal Guardian", "Self (dependent profile)"
  consent_given         BOOLEAN       DEFAULT FALSE,
  consent_document_url  TEXT,
  verified_at           TIMESTAMPTZ,
  verified_by           UUID          REFERENCES users(id),
  created_at            TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT unique_guardian_per_minor UNIQUE (minor_client_id, guardian_user_id)
);

CREATE INDEX idx_guardian_links_tenant ON guardian_links(tenant_id);
CREATE INDEX idx_guardian_links_minor ON guardian_links(minor_client_id);
CREATE INDEX idx_guardian_links_guardian ON guardian_links(guardian_user_id);
```

---

### 2.10 `consultant_profiles`

One-to-one with `users` where `role = 'CONSULTANT'`, created **by** a `TENANT_ADMIN` inside their tenant (PRD §1.1).

```sql
CREATE TABLE consultant_profiles (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID          NOT NULL REFERENCES tenants(id),
  user_id                   UUID          UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_tenant_admin_id UUID         REFERENCES users(id),   -- audit: which Tenant Admin invited them
  full_name                 VARCHAR(200)  NOT NULL,
  category                  consultant_category NOT NULL,
  sub_specialization        VARCHAR(150),
  bio                       TEXT,
  qualifications            TEXT[],
  years_of_experience       SMALLINT,
  consultation_fee          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  currency                  VARCHAR(3)    DEFAULT 'INR',
  languages_spoken          TEXT[],
  timezone                  VARCHAR(50)   DEFAULT 'Asia/Kolkata',
  verification_status       verification_status DEFAULT 'VERIFIED',   -- self-attested; display only, never gates bookability
  rating_avg                NUMERIC(3,2)  DEFAULT 0.00,   -- cached, updated via trigger (§3.3)
  rating_count              INTEGER       DEFAULT 0,
  is_accepting_new_clients  BOOLEAN       DEFAULT TRUE,
  auto_approve_bookings     BOOLEAN       DEFAULT FALSE,
  payment_timing            payment_timing_pref DEFAULT 'PAY_ON_BOOKING',
  payout_account_details    JSONB,                        -- encrypted column (pgcrypto) in production
  calendar_sync_ics_token   UUID          DEFAULT gen_random_uuid(),  -- outbound .ics feed auth (everyday-life feature #5)
  source_tag_note           TEXT,         -- private, own-business referral/source tracking (everyday-life feature #12); never shown to the client
  created_at                TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE consultant_category AS ENUM (
  'MEDICAL', 'LEGAL', 'IT', 'PHYSIOTHERAPY', 'HOMEOPATHY', 'ASTROLOGY'
);
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE payment_timing_pref AS ENUM ('PAY_ON_BOOKING', 'PAY_AFTER_SESSION');

CREATE INDEX idx_consultant_profiles_tenant ON consultant_profiles(tenant_id);
CREATE INDEX idx_consultant_profiles_user ON consultant_profiles(user_id);
CREATE INDEX idx_consultant_profiles_category ON consultant_profiles(tenant_id, category);
CREATE INDEX idx_consultant_profiles_public
  ON consultant_profiles(tenant_id, category, is_accepting_new_clients, rating_avg DESC)
  WHERE is_accepting_new_clients = TRUE;   -- optimizes the tenant's public /book profile lookup
```

---

### 2.11 `consultant_verification_documents`

Self-attested license/ID documents; never reviewed or approved by anyone (no platform verification queue).

```sql
CREATE TABLE consultant_verification_documents (
  id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID                    NOT NULL REFERENCES tenants(id),
  consultant_id     UUID                    NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  document_type     verification_doc_type   NOT NULL,
  file_url          TEXT                    NOT NULL,   -- Supabase Storage path, {tenantId}/{consultantId}/...
  file_name         VARCHAR(255)            NOT NULL,   -- original filename, shown in UI
  issuing_authority VARCHAR(255),
  issued_date       DATE,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ             DEFAULT NOW()
);

CREATE TYPE verification_doc_type AS ENUM (
  'MEDICAL_LICENSE', 'BAR_REGISTRATION', 'DEGREE_CERTIFICATE',
  'GOVERNMENT_ID', 'PROFESSIONAL_CERTIFICATE', 'OTHER'
);

CREATE INDEX idx_verification_docs_tenant ON consultant_verification_documents(tenant_id);
CREATE INDEX idx_verification_docs_consultant ON consultant_verification_documents(consultant_id);
CREATE INDEX idx_verification_docs_expiry ON consultant_verification_documents(expiry_date) WHERE expiry_date IS NOT NULL;
```

---

### 2.12 `availability_slots`

Recurring weekly templates plus date-specific overrides. Double-booking prevention happens at `appointments` (§2.16).

> [!NOTE]
> `start_time`/`end_time` are timezone-naive `TIME` values. DST-safe expansion must evaluate these against the consultant's explicit `timezone` — the "DST-safe recurring slot preview" build item (PRD §5 Phase 3) depends on this.

```sql
CREATE TABLE availability_slots (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id),
  consultant_id         UUID          NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  day_of_week           SMALLINT,                     -- 0=Sunday..6=Saturday; NULL if specific_date set
  specific_date         DATE,                         -- overrides (vacation blocks, one-off extra slots)
  start_time            TIME          NOT NULL,
  end_time              TIME          NOT NULL,
  slot_duration_mins    SMALLINT      NOT NULL DEFAULT 30,
  is_recurring          BOOLEAN       DEFAULT TRUE,
  buffer_before_mins    SMALLINT      DEFAULT 0,
  buffer_after_mins     SMALLINT      DEFAULT 0,
  max_bookings_per_slot SMALLINT      DEFAULT 1,
  status                slot_status   DEFAULT 'OPEN',
  block_reason          TEXT,
  version               INTEGER       NOT NULL DEFAULT 1,   -- optimistic locking
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT day_or_date CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

CREATE TYPE slot_status AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

CREATE INDEX idx_availability_tenant ON availability_slots(tenant_id);
CREATE INDEX idx_availability_consultant ON availability_slots(consultant_id);
CREATE INDEX idx_availability_specific_date ON availability_slots(specific_date) WHERE specific_date IS NOT NULL;
CREATE INDEX idx_availability_open ON availability_slots(consultant_id, status) WHERE status = 'OPEN';
```

---

### 2.13 `out_of_office_periods` *(new)*

Pauses new bookings and auto-replies to client messages during travel/leave, without manually blocking every slot (PRD §1.3, §2 everyday-life feature #14).

```sql
CREATE TABLE out_of_office_periods (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id),
  consultant_id         UUID          NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  start_date            DATE          NOT NULL,
  end_date              DATE          NOT NULL,
  auto_reply_message    TEXT,
  pauses_new_bookings   BOOLEAN       DEFAULT TRUE,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT valid_ooo_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_ooo_tenant ON out_of_office_periods(tenant_id);
CREATE INDEX idx_ooo_consultant_range ON out_of_office_periods(consultant_id, start_date, end_date);
```

---

### 2.14 `cases`

The Client–Consultant relationship container and timeline anchor. Not unique per pair — multiple concurrent cases are allowed if the matters genuinely differ.

```sql
CREATE TABLE cases (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                 NOT NULL REFERENCES tenants(id),
  client_id       UUID                 NOT NULL REFERENCES client_profiles(id),
  consultant_id   UUID                 NOT NULL REFERENCES consultant_profiles(id),
  category        consultant_category  NOT NULL,
  matter_key      VARCHAR(150),        -- disambiguates concurrent cases for the same pair
  status          case_status          DEFAULT 'ACTIVE',
  tags            TEXT[]               NOT NULL DEFAULT ARRAY[]::TEXT[],  -- consultant-editable CRM tags (e.g. "chronic","VIP","needs Hindi"); per-consultant, not tenant-shared
  closed_at       TIMESTAMPTZ,
  closure_reason  TEXT,
  created_at      TIMESTAMPTZ          DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          DEFAULT NOW()
);

CREATE TYPE case_status AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

CREATE INDEX idx_cases_tenant ON cases(tenant_id);
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_consultant ON cases(consultant_id);
CREATE INDEX idx_cases_client_consultant ON cases(client_id, consultant_id);
CREATE UNIQUE INDEX uniq_cases_matter
  ON cases(client_id, consultant_id, matter_key)
  WHERE matter_key IS NOT NULL;
CREATE INDEX idx_cases_status ON cases(tenant_id, status);
CREATE INDEX idx_cases_tags ON cases USING GIN (tags);   -- powers tag filter / bulk-message-by-tag
```

---

### 2.15 `appointment_series` *(new)*

Parent record for a recurring booking ("every Tuesday for 6 weeks"); individual occurrences remain editable/cancellable on their own via `appointments.series_id` (PRD §1.3, §2 everyday-life feature #13).

```sql
CREATE TABLE appointment_series (
  id                  UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID                       NOT NULL REFERENCES tenants(id),
  case_id             UUID                       NOT NULL REFERENCES cases(id),
  consultant_id       UUID                       NOT NULL REFERENCES consultant_profiles(id),
  client_id           UUID                       NOT NULL REFERENCES client_profiles(id),
  day_of_week         SMALLINT                   NOT NULL,
  start_time          TIME                       NOT NULL,
  end_time            TIME                       NOT NULL,
  series_start_date   DATE                       NOT NULL,
  series_end_date     DATE,                      -- either this or occurrence_count must be set
  occurrence_count    SMALLINT,
  status              appointment_series_status  DEFAULT 'ACTIVE',
  payment_mode        series_payment_mode        NOT NULL DEFAULT 'PER_OCCURRENCE',  -- Phase 8 checkout: pay whole series upfront or per-occurrence
  created_at          TIMESTAMPTZ                DEFAULT NOW(),
  updated_at          TIMESTAMPTZ                DEFAULT NOW(),

  CONSTRAINT series_end_or_count CHECK (series_end_date IS NOT NULL OR occurrence_count IS NOT NULL),
  CONSTRAINT valid_series_time_range CHECK (end_time > start_time)
);

CREATE TYPE appointment_series_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE series_payment_mode AS ENUM ('UPFRONT_FULL', 'PER_OCCURRENCE');

CREATE INDEX idx_series_tenant ON appointment_series(tenant_id);
CREATE INDEX idx_series_case ON appointment_series(case_id);
CREATE INDEX idx_series_consultant ON appointment_series(consultant_id);
CREATE INDEX idx_series_status ON appointment_series(status);
```

---

### 2.16 `appointments`

```sql
CREATE TABLE appointments (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID          NOT NULL REFERENCES tenants(id),
  case_id                   UUID          NOT NULL REFERENCES cases(id),
  series_id                 UUID          REFERENCES appointment_series(id),   -- nullable; links an occurrence back to its recurring series
  client_id                 UUID          NOT NULL REFERENCES client_profiles(id),      -- denormalized for RLS/query speed
  consultant_id             UUID          NOT NULL REFERENCES consultant_profiles(id),  -- denormalized for RLS/query speed
  slot_id                   UUID          REFERENCES availability_slots(id),
  scheduled_start           TIMESTAMPTZ   NOT NULL,      -- always stored UTC
  scheduled_end             TIMESTAMPTZ   NOT NULL,
  status                    appointment_status DEFAULT 'REQUESTED',
  rejection_reason          TEXT,
  reschedule_reason         TEXT,
  reschedule_proposed_by    UUID          REFERENCES users(id),
  reschedule_proposed_start TIMESTAMPTZ,
  reschedule_proposed_end   TIMESTAMPTZ,
  reschedule_expires_at     TIMESTAMPTZ,               -- auto-expire window
  mode                      appointment_mode NOT NULL DEFAULT 'VIDEO_EXTERNAL',
  meeting_link              TEXT,                      -- external Zoom/Meet link only
  waitlisted_client_ids     UUID[]        NOT NULL DEFAULT ARRAY[]::UUID[],  -- ordered waitlist for this slot if it fills (everyday-life feature #7)
  fee_amount                NUMERIC(10,2),
  currency                  VARCHAR(3)    DEFAULT 'INR',
  payment_status            payment_status_enum DEFAULT 'UNPAID',
  cancellation_reason       TEXT,
  cancelled_by              UUID          REFERENCES users(id),
  cancelled_at              TIMESTAMPTZ,
  no_show_disputed          BOOLEAN       DEFAULT FALSE,
  no_show_flagged_by        UUID          REFERENCES users(id),
  request_expires_at        TIMESTAMPTZ,               -- consultant response SLA
  created_at                TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT valid_appointment_window CHECK (scheduled_end > scheduled_start)
);

CREATE TYPE appointment_status AS ENUM (
  'REQUESTED', 'APPROVED', 'RESCHEDULE_PROPOSED', 'RESCHEDULED',
  'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'
);
-- Auto-expiry of an unanswered REQUESTED appointment resolves to CANCELLED, not a
-- separate EXPIRED state (matches the scheduled job in §4).
CREATE TYPE appointment_mode AS ENUM ('IN_PERSON', 'AUDIO', 'VIDEO_EXTERNAL');
CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- Concurrency control: prevent two clients from booking the same consultant slot.
-- Enforced at the DB layer via a partial unique index, not just UI checks.
CREATE UNIQUE INDEX uniq_active_consultant_slot
  ON appointments(consultant_id, scheduled_start)
  WHERE status IN ('REQUESTED', 'APPROVED', 'RESCHEDULE_PROPOSED');

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_case ON appointments(case_id);
CREATE INDEX idx_appointments_series ON appointments(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_consultant ON appointments(consultant_id);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_start);
CREATE INDEX idx_appointments_pending_expiry
  ON appointments(request_expires_at) WHERE status = 'REQUESTED';
-- Supports the "SESSION_JOINING_SOON" ~10-min-before reminder job (§4)
CREATE INDEX idx_appointments_joining_soon
  ON appointments(scheduled_start) WHERE status = 'APPROVED';
```

---

### 2.17 `interactions`

A logged session/encounter — may or may not map 1:1 to an `appointment` (supports ad-hoc/quick-capture logging, everyday-life feature #2).

```sql
CREATE TABLE interactions (
  id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID              NOT NULL REFERENCES tenants(id),
  case_id                   UUID              NOT NULL REFERENCES cases(id),
  appointment_id            UUID              REFERENCES appointments(id),   -- nullable
  consultant_id             UUID              NOT NULL REFERENCES consultant_profiles(id),
  type                      interaction_type  NOT NULL,
  occurred_at               TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  raw_audio_url             TEXT,                       -- Supabase bucket, {tenantId}/{caseId}/..., source of truth
  audio_duration_seconds    INTEGER,
  is_partial_capture        BOOLEAN           DEFAULT FALSE,  -- salvaged after crash/drop
  transcript_text           TEXT,
  transcript_status         transcript_status DEFAULT 'NOT_APPLICABLE',
  transcript_language       VARCHAR(10),
  transcript_confidence     NUMERIC(3,2),               -- flags low-confidence output
  notes_text                TEXT,
  consent_given             BOOLEAN,                    -- NULL = not applicable/not asked
  visibility                interaction_visibility DEFAULT 'CONSULTANT_ONLY',
  is_deleted                BOOLEAN           DEFAULT FALSE,   -- soft delete
  deleted_at                TIMESTAMPTZ,
  delete_recoverable_until  TIMESTAMPTZ,
  created_at                TIMESTAMPTZ       DEFAULT NOW(),
  updated_at                TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE interaction_type AS ENUM ('RECORDED_AUDIO', 'NOTE', 'FOLLOW_UP_CALL', 'MESSAGE', 'SCRATCHPAD');
CREATE TYPE transcript_status AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE interaction_visibility AS ENUM ('CONSULTANT_ONLY', 'SHARED_WITH_CLIENT');

CREATE INDEX idx_interactions_tenant ON interactions(tenant_id);
CREATE INDEX idx_interactions_case ON interactions(case_id);
CREATE INDEX idx_interactions_appointment ON interactions(appointment_id);
CREATE INDEX idx_interactions_transcript_status ON interactions(transcript_status)
  WHERE transcript_status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_interactions_active ON interactions(case_id, occurred_at) WHERE is_deleted = FALSE;
CREATE INDEX idx_interactions_fts ON interactions
  USING GIN (to_tsvector('english', coalesce(notes_text, '') || ' ' || coalesce(transcript_text, '')));
```

> `type = 'SCRATCHPAD'` backs the private, never-shared, never-RAG-indexed personal scratchpad (everyday-life feature #9); the retrieval-service layer excludes this type unconditionally, independent of `visibility`.

---

### 2.18 `commitment_templates` *(new)*

Saveable per-consultant library backing everyday-life feature #4 ("do these 3 stretches daily" recurs across clients).

```sql
CREATE TABLE commitment_templates (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id),
  consultant_id  UUID          NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  kind           template_kind NOT NULL,   -- COMMITMENT or TASK
  title          VARCHAR(200)  NOT NULL,
  description    TEXT          NOT NULL,
  default_priority commitment_priority DEFAULT 'MEDIUM',
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE template_kind AS ENUM ('COMMITMENT', 'TASK');

CREATE INDEX idx_commitment_templates_tenant ON commitment_templates(tenant_id);
CREATE INDEX idx_commitment_templates_consultant ON commitment_templates(consultant_id, kind);
```

---

### 2.19 `commitments`

Promises made — typically by consultant to client.

```sql
CREATE TABLE commitments (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID               NOT NULL REFERENCES tenants(id),
  case_id        UUID               NOT NULL REFERENCES cases(id),
  interaction_id UUID               REFERENCES interactions(id),
  template_id    UUID               REFERENCES commitment_templates(id),   -- set if created from the template library
  made_by        commitment_party   NOT NULL,
  description    TEXT               NOT NULL,
  due_date       DATE               NOT NULL,
  status         commitment_status  DEFAULT 'PENDING',
  fulfilled_at   TIMESTAMPTZ,
  fulfilled_by   UUID               REFERENCES users(id),   -- audit: who marked it fulfilled
  priority       commitment_priority DEFAULT 'MEDIUM',
  created_at     TIMESTAMPTZ        DEFAULT NOW(),
  updated_at     TIMESTAMPTZ        DEFAULT NOW()
);

CREATE TYPE commitment_party AS ENUM ('CONSULTANT', 'CLIENT');
CREATE TYPE commitment_status AS ENUM ('PENDING', 'IN_PROGRESS', 'FULFILLED', 'MISSED', 'CANCELLED');
CREATE TYPE commitment_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE INDEX idx_commitments_tenant ON commitments(tenant_id);
CREATE INDEX idx_commitments_case ON commitments(case_id);
CREATE INDEX idx_commitments_due ON commitments(due_date) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_commitments_status ON commitments(tenant_id, status);
```

---

### 2.20 `tasks` / `task_reminders`

Action items, typically assigned to the client; front-and-center on the client dashboard.

```sql
CREATE TABLE tasks (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id),
  case_id        UUID          NOT NULL REFERENCES cases(id),
  interaction_id UUID          REFERENCES interactions(id),
  template_id    UUID          REFERENCES commitment_templates(id),
  assigned_to    task_assignee NOT NULL DEFAULT 'CLIENT',
  title          VARCHAR(200)  NOT NULL,
  description    TEXT,
  due_date       DATE,
  status         task_status   DEFAULT 'PENDING',
  completed_at   TIMESTAMPTZ,
  completed_by   UUID          REFERENCES users(id),
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE task_assignee AS ENUM ('CLIENT', 'CONSULTANT');
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);

CREATE TABLE task_reminders (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID          NOT NULL REFERENCES tenants(id),
  task_id      UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at    TIMESTAMPTZ   NOT NULL,
  channel      notification_channel NOT NULL,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_task_reminders_pending ON task_reminders(remind_at) WHERE sent_at IS NULL;
```

---

### 2.21 `documents`

Append-only, self-referencing versions; visibility toggle (client-shared vs. private) set per version.

```sql
CREATE TABLE documents (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID                NOT NULL REFERENCES tenants(id),
  case_id             UUID                NOT NULL REFERENCES cases(id),
  interaction_id      UUID                REFERENCES interactions(id),
  uploaded_by         UUID                NOT NULL REFERENCES users(id),
  previous_version_id UUID                REFERENCES documents(id),   -- self-referencing version chain
  version_number      INTEGER             NOT NULL DEFAULT 1,
  file_url            TEXT                NOT NULL,   -- {tenantId}/{caseId}/... Supabase Storage path
  file_name           VARCHAR(255)        NOT NULL,
  mime_type           VARCHAR(100),
  file_size_bytes     BIGINT,
  source              document_source     NOT NULL DEFAULT 'DESKTOP_UPLOAD',   -- e.g. mobile-camera capture (PRD §3.7)
  visibility          document_visibility DEFAULT 'CONSULTANT_ONLY',
  is_deleted          BOOLEAN             DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  delete_recoverable_until TIMESTAMPTZ,
  created_at          TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE document_source AS ENUM ('DESKTOP_UPLOAD', 'MOBILE_CAMERA', 'SYSTEM_GENERATED');
CREATE TYPE document_visibility AS ENUM ('CONSULTANT_ONLY', 'SHARED_WITH_CLIENT');

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_version_chain ON documents(previous_version_id) WHERE previous_version_id IS NOT NULL;
CREATE INDEX idx_documents_active ON documents(case_id) WHERE is_deleted = FALSE;
```

---

### 2.22 `chat_messages`, `ai_summaries`, `rag_citations`

Case-scoped AI chat and generated summaries. Retrieval is hard-scoped by **both** `tenant_id` and `case_id` at the retrieval-service layer (PRD §1.2) — Pinecone uses one namespace per tenant with a mandatory `caseId` metadata filter on every query, never left to prompt instructions.

```sql
CREATE TABLE chat_messages (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID           NOT NULL REFERENCES tenants(id),
  case_id      UUID           NOT NULL REFERENCES cases(id),
  sender_id    UUID           NOT NULL REFERENCES users(id),
  sender_role  user_role      NOT NULL,
  role         chat_role      NOT NULL,   -- USER or ASSISTANT
  content      TEXT           NOT NULL,
  feedback     chat_feedback,             -- thumbs up/down
  created_at   TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TYPE chat_role AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE chat_feedback AS ENUM ('THUMBS_UP', 'THUMBS_DOWN');

CREATE INDEX idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX idx_chat_messages_case ON chat_messages(case_id, created_at);

CREATE TABLE ai_summaries (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID              NOT NULL REFERENCES tenants(id),
  case_id          UUID              NOT NULL REFERENCES cases(id),
  interaction_id   UUID              REFERENCES interactions(id),   -- set for "Generate session recap"
  summary_type     ai_summary_type   NOT NULL DEFAULT 'SESSION_RECAP',
  content          TEXT              NOT NULL,
  visibility       interaction_visibility DEFAULT 'CONSULTANT_ONLY',   -- Client view (Phase 9) only ever sees SHARED_WITH_CLIENT rows
  is_flagged       BOOLEAN           DEFAULT FALSE,   -- excluded from RAG ground truth but retained for review
  created_at       TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE ai_summary_type AS ENUM ('SESSION_RECAP', 'CASE_OVERVIEW');

CREATE INDEX idx_ai_summaries_tenant ON ai_summaries(tenant_id);
CREATE INDEX idx_ai_summaries_case ON ai_summaries(case_id);
CREATE INDEX idx_ai_summaries_ground_truth ON ai_summaries(case_id) WHERE is_flagged = FALSE;

CREATE TABLE rag_citations (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID            NOT NULL REFERENCES tenants(id),
  parent_id    UUID            NOT NULL REFERENCES ai_summaries(id) ON DELETE CASCADE,
  source_type  citation_source NOT NULL,   -- INTERACTION or DOCUMENT
  source_id    UUID            NOT NULL,
  excerpt      TEXT,
  created_at   TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TYPE citation_source AS ENUM ('INTERACTION', 'DOCUMENT');

CREATE INDEX idx_rag_citations_tenant ON rag_citations(tenant_id);
CREATE INDEX idx_rag_citations_parent ON rag_citations(parent_id);
```

---

### 2.23 `reviews`

Post-session feedback: the existing 1–5 star rating plus a richer 0–10 NPS-style likelihood-to-recommend signal (PRD §1.3, §3.13).

```sql
CREATE TABLE reviews (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id),
  case_id        UUID          NOT NULL REFERENCES cases(id),
  appointment_id UUID          NOT NULL REFERENCES appointments(id),
  client_id      UUID          NOT NULL REFERENCES client_profiles(id),
  consultant_id  UUID          NOT NULL REFERENCES consultant_profiles(id),
  rating         SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  nps_score      SMALLINT      CHECK (nps_score BETWEEN 0 AND 10),   -- nullable: not every legacy review has one
  review_text    TEXT,
  is_visible     BOOLEAN       DEFAULT TRUE,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT uniq_review_per_appointment UNIQUE (appointment_id)
);

CREATE INDEX idx_reviews_tenant ON reviews(tenant_id);
CREATE INDEX idx_reviews_consultant ON reviews(consultant_id) WHERE is_visible = TRUE;
CREATE INDEX idx_reviews_case ON reviews(case_id);
```

---

### 2.24 `grievances` *(new)*

Persistent, tenant-agnostic client reporting channel that goes **straight to the platform**, bypassing that tenant's own Tenant Admin (PRD §4). `tenant_id` is stored for context only — it is deliberately **excluded** from any RLS policy that would grant the Tenant Admin visibility (see §5.6).

```sql
CREATE TABLE grievances (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID                NOT NULL REFERENCES tenants(id),   -- context only, NOT a visibility grant
  client_id                 UUID                NOT NULL REFERENCES client_profiles(id),
  subject_type              grievance_subject    NOT NULL,
  subject_consultant_id     UUID                REFERENCES consultant_profiles(id),
  case_id                   UUID                REFERENCES cases(id),
  category                  grievance_category   NOT NULL,
  description                TEXT                NOT NULL,
  attachment_urls            TEXT[]              NOT NULL DEFAULT ARRAY[]::TEXT[],
  severity                   grievance_severity   DEFAULT 'MEDIUM',
  status                     grievance_status     DEFAULT 'OPEN',
  assigned_to_super_admin_id UUID                REFERENCES users(id),
  resolution_notes           TEXT,
  resolved_at                TIMESTAMPTZ,
  submitted_at               TIMESTAMPTZ         DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE grievance_subject AS ENUM ('CONSULTANT', 'TENANT_ADMIN', 'BILLING', 'PLATFORM', 'OTHER');
CREATE TYPE grievance_category AS ENUM ('SERVICE_QUALITY', 'MISCONDUCT', 'BILLING_DISPUTE', 'DATA_PRIVACY', 'OTHER');
CREATE TYPE grievance_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE grievance_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- Deliberately NO index/FK combination here optimizes for "Tenant Admin looks up their tenant's
-- grievances" — that access path does not exist by design (PRD §4.2).
CREATE INDEX idx_grievances_client ON grievances(client_id);
CREATE INDEX idx_grievances_status_severity ON grievances(status, severity);
CREATE INDEX idx_grievances_assigned ON grievances(assigned_to_super_admin_id) WHERE status != 'RESOLVED' AND status != 'DISMISSED';

-- Basic per-client rate limiting (PRD §4.3): enforced at the application layer against
-- COUNT(*) WHERE client_id = :id AND submitted_at > NOW() - INTERVAL '1 day', not a DB constraint,
-- since a genuine repeat complainant must never be silently blocked by the database.
```

> A grievance about the platform/Super Admin itself routes to a fixed out-of-band support email, not this table (PRD §4.3, §6 Open Point #4 — no dedicated table needed; it's a routing decision at the form layer, not a schema concern).

---

### 2.25 `consultant_analytics_snapshot` *(new)*

Scheduled-aggregation cache backing the overbooking/burnout indicator and smart slot suggestions — computed periodically rather than querying raw history live on every dashboard load (PRD §1.3).

```sql
CREATE TABLE consultant_analytics_snapshot (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID          NOT NULL REFERENCES tenants(id),
  consultant_id             UUID          NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  snapshot_date             DATE          NOT NULL,
  booked_hours_7d           NUMERIC(6,2)  DEFAULT 0,
  overdue_commitment_count  INTEGER       DEFAULT 0,
  overdue_task_count        INTEGER       DEFAULT 0,
  burnout_flag              BOOLEAN       DEFAULT FALSE,   -- soft warning threshold crossed
  repeat_booking_rate       NUMERIC(5,2),                  -- % of clients with 2+ appointments
  avg_fee_realized          NUMERIC(10,2),
  slot_cancellation_rates   JSONB         NOT NULL DEFAULT '{}',  -- {day_of_week}_{hour}: cancellation_rate, powers smart slot suggestions
  created_at                TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT uniq_snapshot_per_day UNIQUE (consultant_id, snapshot_date)
);

CREATE INDEX idx_analytics_snapshot_tenant ON consultant_analytics_snapshot(tenant_id);
CREATE INDEX idx_analytics_snapshot_consultant_latest ON consultant_analytics_snapshot(consultant_id, snapshot_date DESC);
```

---

### 2.26 `referrals` *(new — client→client growth program)*

Formal client-invites-client program (distinct from the passive `source_tag_note` on §2.10), per PRD §1.3 and everyday-life feature #19.

```sql
CREATE TABLE referrals (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID              NOT NULL REFERENCES tenants(id),
  consultant_id         UUID              NOT NULL REFERENCES consultant_profiles(id),
  referring_client_id   UUID              NOT NULL REFERENCES client_profiles(id),
  referred_client_id    UUID              REFERENCES client_profiles(id),   -- nullable until the invitee signs up
  referral_code         VARCHAR(20)       NOT NULL,
  reward_type           referral_reward_type DEFAULT 'NONE',
  reward_status         referral_reward_status DEFAULT 'PENDING',
  created_at             TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE referral_reward_type AS ENUM ('DISCOUNT_CODE', 'CREDIT', 'NONE');
CREATE TYPE referral_reward_status AS ENUM ('PENDING', 'GRANTED');

CREATE INDEX idx_referrals_tenant ON referrals(tenant_id);
CREATE INDEX idx_referrals_referring_client ON referrals(referring_client_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
```

---

### 2.27 `consultant_referrals` *(new — cross-consultant, same tenant)*

Hands a client sideways to a colleague within the same tenant with context carried over (PRD §1.3, everyday-life feature #16). On acceptance, a new `cases` row is created under `to_consultant_id` seeded with `context_note`.

```sql
CREATE TABLE consultant_referrals (
  id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID                        NOT NULL REFERENCES tenants(id),
  from_consultant_id  UUID                        NOT NULL REFERENCES consultant_profiles(id),
  to_consultant_id    UUID                        NOT NULL REFERENCES consultant_profiles(id),
  client_id           UUID                        NOT NULL REFERENCES client_profiles(id),
  source_case_id      UUID                        NOT NULL REFERENCES cases(id),
  resulting_case_id   UUID                        REFERENCES cases(id),   -- set once accepted
  context_note        TEXT                        NOT NULL,   -- carried-over summary, not raw private notes unless explicitly shared
  status              consultant_referral_status  DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ                 DEFAULT NOW(),
  responded_at        TIMESTAMPTZ,

  CONSTRAINT different_consultants CHECK (from_consultant_id != to_consultant_id)
);

CREATE TYPE consultant_referral_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE INDEX idx_consultant_referrals_tenant ON consultant_referrals(tenant_id);
CREATE INDEX idx_consultant_referrals_incoming ON consultant_referrals(to_consultant_id, status);
CREATE INDEX idx_consultant_referrals_outgoing ON consultant_referrals(from_consultant_id, status);

-- Same-tenant constraint (not expressible as a simple CHECK across two FK'd rows without a
-- function): enforced via a BEFORE INSERT trigger that verifies
-- from_consultant.tenant_id = to_consultant.tenant_id = NEW.tenant_id (see §3.6).
```

---

### 2.28 `notifications` / `notification_preferences`

```sql
CREATE TABLE notifications (
  id           UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID                REFERENCES tenants(id),   -- NULL for platform-level notices (e.g., to Super Admin)
  user_id      UUID                NOT NULL REFERENCES users(id),
  type         notification_type   NOT NULL,
  channel      notification_channel NOT NULL,
  title        VARCHAR(255)        NOT NULL,
  body         TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id   UUID,
  read_at      TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM (
  'APPOINTMENT_REQUESTED', 'APPOINTMENT_APPROVED', 'APPOINTMENT_REJECTED',
  'RESCHEDULE_PROPOSED', 'APPOINTMENT_CANCELLED', 'SESSION_JOINING_SOON',
  'COMMITMENT_DUE_SOON', 'COMMITMENT_MISSED', 'TASK_DUE_SOON', 'TASK_OVERDUE',
  'REVIEW_REQUESTED', 'PAYMENT_RECEIVED', 'PAYOUT_PROCESSED',
  'GRIEVANCE_SUBMITTED', 'GRIEVANCE_STATUS_CHANGED',
  'REFERRAL_REDEEMED', 'CONSULTANT_REFERRAL_RECEIVED',
  'WAITLIST_SLOT_AVAILABLE', 'OTHER'
);
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE TABLE notification_preferences (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type  notification_type NOT NULL,
  channel            notification_channel NOT NULL,
  enabled            BOOLEAN       DEFAULT TRUE,
  lead_time_minutes  INTEGER,      -- for *_DUE_SOON / *_JOINING_SOON types

  CONSTRAINT uniq_pref_per_channel UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
```

---

### 2.29 `audit_logs`

Tenant-scoped for ordinary escalated access (e.g., a Tenant Admin viewing a Consultant's private notes during dispute mediation); **also** the log of record for cross-tenant `SUPER_ADMIN` reads (PRD §1.2, §1.4).

```sql
CREATE TABLE audit_logs (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          REFERENCES tenants(id),   -- the tenant whose data was accessed; NULL for platform-only actions (e.g., tenant creation)
  actor_user_id         UUID          NOT NULL REFERENCES users(id),
  actor_role            user_role     NOT NULL,
  is_cross_tenant_access BOOLEAN      NOT NULL DEFAULT FALSE,   -- TRUE when actor_role = SUPER_ADMIN reading into a tenant
  action                VARCHAR(100)  NOT NULL,   -- e.g. 'VIEW_CASE', 'SUSPEND_TENANT', 'RESOLVE_GRIEVANCE'
  entity_type           VARCHAR(50)   NOT NULL,
  entity_id             UUID,
  reason                TEXT,         -- mandatory (enforced at application layer) for any Super Admin read beyond the tenant list/billing dashboard
  metadata               JSONB        NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_cross_tenant ON audit_logs(is_cross_tenant_access) WHERE is_cross_tenant_access = TRUE;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

### 2.30 `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID          REFERENCES tenants(id),   -- NULL for a Super Admin's own device
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint     TEXT          NOT NULL UNIQUE,
  keys         JSONB         NOT NULL,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_tenant ON push_subscriptions(tenant_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

---

## 3. Functions & Triggers

### 3.1 Session-scoped tenant context (backbone of §5 RLS)

Set once per request in application middleware from the verified JWT — never from a client-supplied header or query param:

```sql
-- Called by the app immediately after authenticating a request:
-- SELECT set_config('app.tenant_id', $1, true);       -- true = local to the current transaction
-- SELECT set_config('app.is_super_admin', $1, true);  -- 'true' | 'false'
```

### 3.2 Auto-stamp `tenant_id` on insert (defense in depth)

Belt-and-braces trigger so an application bug can't insert a tenant-scoped row with a mismatched or missing `tenant_id` — it is always forced to the session's tenant context except for `SUPER_ADMIN` sessions performing a logged cross-tenant write.

```sql
CREATE OR REPLACE FUNCTION enforce_session_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.is_super_admin', true) = 'true' THEN
    RETURN NEW;   -- Super Admin writes may legitimately target any tenant; access is still audit-logged at the app layer
  END IF;
  NEW.tenant_id := current_setting('app.tenant_id')::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to every tenant-scoped table, e.g.:
CREATE TRIGGER trg_cases_tenant_id BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION enforce_session_tenant_id();
-- (repeat for appointments, interactions, commitments, tasks, documents, payments,
--  notifications, reviews, grievances, referrals, consultant_referrals, etc.)
```

### 3.3 Refresh cached consultant rating (unchanged pattern, tenant-safe)

```sql
CREATE OR REPLACE FUNCTION refresh_consultant_avg_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_consultant_id UUID := COALESCE(NEW.consultant_id, OLD.consultant_id);
BEGIN
  UPDATE consultant_profiles
  SET rating_avg = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews
        WHERE consultant_id = v_consultant_id AND is_visible = TRUE
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM reviews
        WHERE consultant_id = v_consultant_id AND is_visible = TRUE
      )
  WHERE id = v_consultant_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_consultant_avg_rating();
```

### 3.4 Auto-expire reschedule proposal → cancel appointment

Run by the scheduled job in §4, not a row trigger (time-based, not event-based):

```sql
CREATE OR REPLACE FUNCTION expire_stale_reschedule_proposals()
RETURNS void AS $$
BEGIN
  UPDATE appointments
  SET status = 'CANCELLED',
      cancellation_reason = 'Reschedule proposal not answered in time'
  WHERE status = 'RESCHEDULE_PROPOSED'
    AND reschedule_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 3.5 Accept a cross-consultant referral → seed a new Case

```sql
CREATE OR REPLACE FUNCTION accept_consultant_referral(p_referral_id UUID)
RETURNS UUID AS $$
DECLARE
  v_referral consultant_referrals%ROWTYPE;
  v_new_case_id UUID;
BEGIN
  SELECT * INTO v_referral FROM consultant_referrals WHERE id = p_referral_id AND status = 'PENDING';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral not found or already resolved';
  END IF;

  INSERT INTO cases (tenant_id, client_id, consultant_id, category, matter_key, status)
  SELECT v_referral.tenant_id, v_referral.client_id, v_referral.to_consultant_id,
         cp.category, NULL, 'ACTIVE'
  FROM consultant_profiles cp WHERE cp.id = v_referral.to_consultant_id
  RETURNING id INTO v_new_case_id;

  -- Seed the new case with the carried-over context note as its first interaction
  INSERT INTO interactions (tenant_id, case_id, consultant_id, type, notes_text, visibility)
  VALUES (v_referral.tenant_id, v_new_case_id, v_referral.to_consultant_id, 'NOTE', v_referral.context_note, 'CONSULTANT_ONLY');

  UPDATE consultant_referrals
  SET status = 'ACCEPTED', resulting_case_id = v_new_case_id, responded_at = NOW()
  WHERE id = p_referral_id;

  RETURN v_new_case_id;
END;
$$ LANGUAGE plpgsql;
```

### 3.6 Enforce same-tenant cross-consultant referrals

```sql
CREATE OR REPLACE FUNCTION check_consultant_referral_same_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_from_tenant UUID;
  v_to_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_from_tenant FROM consultant_profiles WHERE id = NEW.from_consultant_id;
  SELECT tenant_id INTO v_to_tenant FROM consultant_profiles WHERE id = NEW.to_consultant_id;
  IF v_from_tenant != v_to_tenant OR v_from_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cross-consultant referrals must stay within the same tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultant_referral_same_tenant
  BEFORE INSERT ON consultant_referrals
  FOR EACH ROW EXECUTE FUNCTION check_consultant_referral_same_tenant();
```

### 3.7 Mark RAG source unavailable without invalidating past summaries

Handled by soft-delete on `interactions`/`documents` plus a read-time join — no destructive trigger needed:

```sql
SELECT c.*,
  CASE WHEN i.is_deleted THEN 'SOURCE_UNAVAILABLE' ELSE 'AVAILABLE' END AS source_availability
FROM rag_citations c
LEFT JOIN interactions i ON c.source_type = 'INTERACTION' AND c.source_id = i.id
WHERE c.parent_id = :summaryId AND c.tenant_id = current_setting('app.tenant_id')::uuid;
```

---

## 4. Scheduled Jobs (Cron)

| Job | Schedule | Description |
|---|---|---|
| Expire unanswered booking requests | Every 15 min | Per-tenant sweep: `UPDATE appointments SET status='CANCELLED', cancellation_reason='Consultant did not respond in time' WHERE status='REQUESTED' AND request_expires_at < NOW()` |
| Expire unanswered reschedule proposals | Every 15 min | See §3.4 |
| Flag `NO_SHOW` appointments | Every 15 min | Mark `APPROVED` appointments as `NO_SHOW` after grace period past `scheduled_end` if session never started |
| Session-joining-soon reminders | Every 5 min | Notify Client + Consultant (`SESSION_JOINING_SOON`) ~10 min before `scheduled_start` for `APPROVED` appointments, surfacing the external video link |
| Mark commitments `MISSED` | Every hour | `UPDATE commitments SET status='MISSED' WHERE status IN ('PENDING','IN_PROGRESS') AND due_date < CURRENT_DATE` → triggers `COMMITMENT_MISSED` notification |
| Mark tasks `OVERDUE` | Every hour | Same pattern for `tasks` → triggers `TASK_OVERDUE` |
| Commitment/task due-soon reminders | Every 30 min | Notify at configurable lead time via enabled channels, respecting `notification_preferences` |
| Out-of-office auto-reply sweep | Every 5 min | For each active `out_of_office_periods` row with `pauses_new_bookings = TRUE`, block new bookings and auto-reply to inbound client messages for that consultant |
| Payment reconciliation | Every 10 min | Reconcile `payments` where `status='CREATED'` and `webhook_received_at IS NULL` against Razorpay API, per tenant's payout account |
| Consultant document expiry check | Daily | Flag `consultant_verification_documents` where `expiry_date < NOW()` and notify the consultant to re-upload; never affects bookability, which is controlled solely by `is_accepting_new_clients` |
| Interaction/document hard-delete sweep | Daily | Permanently remove soft-deleted rows past `delete_recoverable_until`, scoped per tenant's storage prefix |
| Document lifecycle/archival | Weekly | Move older documents to cold storage tier per tenant/consultant/client quota policy |
| Consultant analytics snapshot | Daily | Aggregate booked hours, overdue counts, repeat-booking rate, and slot cancellation rates per consultant into `consultant_analytics_snapshot`; powers the burnout indicator and smart slot suggestions without live raw-history queries |
| Grievance SLA check | Hourly | Flag `OPEN`/`UNDER_REVIEW` grievances open past an internal SLA threshold for Super Admin escalation; `CRITICAL` severity additionally triggers an immediate SMS on creation (handled at insert time, not this job) |
| OTP cleanup | Hourly | Delete expired `otp_verifications` rows |
| Push subscription cleanup | Weekly | Remove subscriptions that returned HTTP 410 Gone |
| AI summary re-indexing | On interaction soft-delete | Recompute `source_availability` cache if materialized (optional optimization) |

---

## 5. Row-Level Security (Supabase / PostgreSQL)

Tenant isolation is the non-negotiable NFR of the whole platform (PRD §1.2): a Consultant's queries must never return another tenant's data, a Client must never see another tenant's or another client's data, and even the unrestricted `SUPER_ADMIN` role only bypasses isolation through an explicit, logged path — never silently.

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- (and every other tenant-scoped table listed in §2)
```

> `public.current_app_user_id()` maps the Supabase **auth** user id (`auth.uid()`) to the app's `users.id`, exactly as in v1. Every policy below additionally gates on `tenant_id`, sourced from `current_setting('app.tenant_id')` — set server-side from the JWT, never from a client-supplied header or query param — with an explicit `is_super_admin` bypass.

### 5.1 Baseline tenant-isolation policy (applied per-table)

```sql
-- Generic shape, applied verbatim (with the table name substituted) to every
-- tenant-scoped table: cases, appointments, interactions, documents, commitments,
-- tasks, chat_messages, ai_summaries, rag_citations, reviews, referrals,
-- consultant_referrals, notifications, audit_logs, etc.
CREATE POLICY tenant_isolation_cases ON cases
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

### 5.2 Participant-level policy layered on top (unchanged relationship logic, now tenant-scoped)

```sql
-- A case is visible only to its client or its consultant, WITHIN the resolved tenant.
CREATE POLICY case_participant_access ON cases
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
    AND (
      client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
      OR consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
    )
  );

-- Interactions marked CONSULTANT_ONLY stay invisible to the client even within a shared case.
CREATE POLICY interaction_visibility_policy ON interactions
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
    AND (
      consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
      OR (
        visibility = 'SHARED_WITH_CLIENT'
        AND case_id IN (
          SELECT id FROM cases WHERE client_id IN (
            SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id()
          )
        )
      )
    )
  );

-- Clients can query only tasks assigned to them — never private notes.
CREATE POLICY task_client_visibility ON tasks
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
    AND (
      (assigned_to = 'CLIENT' AND case_id IN (
        SELECT id FROM cases WHERE client_id IN (
          SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id()
        )
      ))
      OR case_id IN (
        SELECT id FROM cases WHERE consultant_id IN (
          SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id()
        )
      )
    )
  );

-- RAG retrieval is hard-scoped at the same layer — the vector store query and the Postgres
-- query both filter by tenant_id AND case_id server-side, never trusting a prompt-supplied value.
CREATE POLICY chat_case_scope ON chat_messages
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
    AND case_id IN (
      SELECT id FROM cases WHERE client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
      UNION
      SELECT id FROM cases WHERE consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
    )
  );
```

### 5.3 Tenant Admin escalated access (logged, not free)

```sql
-- Ordinary SELECT policies above do NOT include TENANT_ADMIN — per §1.4, Tenant Admin access
-- to private clinical/legal notes is "logged escalation only," mirroring the v1 admin pattern.
-- A Tenant Admin dispute-mediation view instead calls a SECURITY DEFINER function that requires
-- a non-null access_justification, writes to audit_logs (tenant_id = their own tenant,
-- is_cross_tenant_access = FALSE), and only then returns rows — never a standing RLS grant.
CREATE OR REPLACE FUNCTION tenant_admin_view_case(p_case_id UUID, p_reason TEXT)
RETURNS SETOF cases AS $$
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'access_justification (reason) is required for escalated case access';
  END IF;

  INSERT INTO audit_logs (tenant_id, actor_user_id, actor_role, is_cross_tenant_access, action, entity_type, entity_id, reason)
  VALUES (current_setting('app.tenant_id')::uuid, public.current_app_user_id(), 'TENANT_ADMIN', FALSE, 'VIEW_CASE_ESCALATED', 'cases', p_case_id, p_reason);

  RETURN QUERY SELECT * FROM cases WHERE id = p_case_id AND tenant_id = current_setting('app.tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.4 Super Admin cross-tenant access (unrestricted, but never invisible)

```sql
-- The generic policy in §5.1 already lets is_super_admin bypass tenant_id via USING/WITH CHECK.
-- What makes it "unrestricted but not invisible" (PRD §1.2) is that every such SELECT is
-- expected to route through a logging wrapper at the application/API layer — the RLS bypass
-- alone does not write the audit row, so the API server (not the client) is responsible for:
--   1. Confirming a non-null `reason` for anything beyond the tenant list/billing dashboard.
--   2. Writing an audit_logs row with is_cross_tenant_access = TRUE, actor_role = 'SUPER_ADMIN'.
-- This mirrors the SECURITY DEFINER pattern in §5.3 but is invoked from the platform console,
-- not the tenant console, and is permitted to target any tenant_id.
```

### 5.5 Grievance access (the one deliberate exception)

```sql
-- Client sees only their own submissions and status; Tenant Admin and Consultant are
-- excluded entirely, by design — no policy below grants them any row, ever (PRD §4.2).
CREATE POLICY grievance_client_own_submissions ON grievances
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
  );

CREATE POLICY grievance_client_insert ON grievances
  FOR INSERT
  WITH CHECK (
    client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
  );

-- Super Admin sees and triages everything, globally, regardless of tenant_id — this is the
-- only table where the tenant_id-based policy from §5.1 is intentionally NOT applied, since
-- tenant_id here is context metadata, not an access boundary.
CREATE POLICY grievance_super_admin_full_access ON grievances
  FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');
```

### 5.6 Why Tenant Admin has zero policies on `grievances`

This is the one place the normal "tenants see their own tenant's activity" rule is intentionally broken (PRD §4.2). No policy grants `TENANT_ADMIN` any row on this table by `tenant_id` — not even a read-only, redacted one — because the schema takes no position (pending PRD §6 Open Point #5) on whether an anonymized, aggregate grievance-count metric should ever be surfaced back to a Tenant Admin. If that's approved later, it should be a separate, pre-aggregated view (e.g., a monthly `COUNT(*) GROUP BY tenant_id` materialized view with no `client_id`/`description`/`attachment_urls` columns at all) rather than a relaxed policy on this table, to avoid re-identifying a complainant in a small tenant.

---

## 6. Data Retention Policy

| Table | Retention | Notes |
|---|---|---|
| `tenants` (archived) | Indefinite, `status = 'ARCHIVED'` | No hard delete; a suspended/archived tenant's data remains for compliance and potential reinstatement |
| `users` (deleted) | PII zeroed after 30 days of deletion request | Except where legal hold applies; scoped per-tenant except `SUPER_ADMIN` |
| `cases` / `commitments` / `tasks` | While account is active; Medical/Legal may be anonymized-retained on deletion request | Deletion-request conflict resolution is out of scope for this draft — flagged for a follow-up `case_deletion_requests` table, unchanged in spirit from v1 |
| `interactions` (transcripts/notes) | Same as parent case / bucket lifecycle | Soft-delete recovery window: 30 days, then hard delete |
| `documents` | Not stored outside the linked Supabase bucket | `documents` rows are references; deleting bucket objects at the `{tenantId}/{caseId}/...` prefix removes file access |
| `chat_messages` / `ai_summaries` | 2 years | Flagged summaries retained for review but excluded from RAG ground truth |
| `grievances` | 7 years | Platform-level compliance record; never purged on tenant archival since the subject may include the tenant itself |
| `audit_logs` | 7 years | Compliance requirement; includes the cross-tenant Super Admin access log |
| `notifications` | 6 months | |
| `otp_verifications` | 24 hours | |
| `refresh_tokens` | Deleted on expiry | |
| `push_subscriptions` | Deleted on push failure (410 Gone) | |
| `consultant_analytics_snapshot` | 13 months rolling | Enough history for year-over-year busiest-hours comparison; older snapshots pruned weekly |

---

## 7. Migration Strategy

- Schema changes managed via **Prisma Migrate** (development) and **`prisma migrate deploy`** (CI/CD).
- No destructive migrations without a prior backup snapshot.
- Zero-downtime pattern: add nullable columns first, backfill, then add `NOT NULL`/constraints in a follow-up migration.
- `tenants` and `users` must both exist before the `fk_tenants_created_by` constraint (§2.1/§2.4) is added — first migration creates both tables without that FK, a second migration adds it.
- New `consultant_category` values (category expansion beyond the current six) are additive `ALTER TYPE ... ADD VALUE` migrations; `client_category_profiles.data` (JSONB) absorbs new category-specific fields without a schema migration at all.
- Resolving PRD §6 Open Point #1 (Tenant Admin/Consultant same-login) or Open Point #2 (Client identity spanning tenants) are **breaking** schema changes (role model / uniqueness constraints on `users`) and should be scheduled as their own migration, not bundled with unrelated feature work.
- Migration files version-controlled under `/prisma/migrations/`.
