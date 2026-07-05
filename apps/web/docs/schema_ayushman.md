# Ayushman — Database Schema Documentation

**Version**: 1.0.0
**Database**: PostgreSQL 16 (Supabase)
**ORM**: Prisma
**Last Updated**: July 2026

> Derived from `readme.md` (PRD) §6 (Entities & Attributes), §7 (Functional Requirements), §8 (NFRs), and §9 (Edge Cases). Table/column naming follows `snake_case` for SQL and maps 1:1 to Prisma's `camelCase` fields via `@map`.

---

## 1. Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────────────────
  │                             │                             │                 │
  ▼ (as client)                 ▼ (as consultant)              ▼ (guardian)      │
client_profiles          consultant_profiles            guardian_links          │
  │                             │  │                                            │
  │                             │  └── consultant_verification_documents        │
  │                             ▼                                               │
  │                      availability_slots                                    │
  │                             │                                               │
  └───────────┬─────────────────┘                                              │
              ▼                                                                 │
            cases ──────────────────────────────────────────────────┐          │
              │                                                      │          │
              ▼                                                      ▼          │
        appointments ────► payments ────► invoices              case_deletion_ │
              │                                                  requests       │
              ▼                                                                 │
        interactions ──┬──► commitments                                        │
              │         └──► tasks ──► task_reminders                          │
              ▼                                                                 │
          documents (self-referencing versions)                                │
              │                                                                 │
              ▼                                                                 │
        ai_summaries ──► rag_citations ◄── chat_messages                       │
                                                                                  │
reviews ──────────────────────────────────────────────────────────────────────┤
notifications ──► notification_preferences                                     │
audit_logs ─────────────────────────────────────────────────────────────────────┘
push_subscriptions / otp_verifications / refresh_tokens (cross-cutting, all ref users)
```

Design principles reflected below (see PRD §8 NFRs and §9 Edge Cases):
- **Case, not User-pair, is the timeline anchor** — a Client/Consultant pair may have multiple concurrent `cases` (PRD §9.37).
- **Row-Level Security (RLS)** enforced at the database layer, not just application code, for tenant isolation (PRD §8, §9.28).
- **Soft-delete + recovery window** on `interactions` and `documents` rather than hard delete (PRD §9.16, §9.24).
- **Append-only versioning** on `documents`, never overwrite (PRD §9.24).
- **RAG citations are normalized rows**, not JSON blobs, so retrieval scoping and "exclude flagged summaries from ground truth" are enforceable with plain SQL filters, not prompt-layer trust (PRD §9.27, §9.28).

---

## 2. Table Definitions

### 2.1 `users`

Base authentication identity. All roles (client, consultant, admin) are users.

```sql
CREATE TABLE users (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_user_id UUID          UNIQUE,       -- maps to auth.users.id for auth sync and RLS helper
  email                 VARCHAR(255)  UNIQUE NOT NULL,
  phone                 VARCHAR(20)   UNIQUE,
  phone_verified        BOOLEAN       DEFAULT FALSE,
  email_verified        BOOLEAN       DEFAULT FALSE,
  password_hash         TEXT,                          -- NULL for OAuth-only users
  auth_provider_id      VARCHAR(255)  UNIQUE,           -- NULL if password-based
  role                  user_role     NOT NULL,
  account_status        account_status DEFAULT 'ACTIVE',
  is_active             BOOLEAN       DEFAULT TRUE,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('CLIENT', 'CONSULTANT', 'ADMIN');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_auth_provider ON users(auth_provider_id);
CREATE INDEX idx_users_role ON users(role);
```

---

### 2.2 `otp_verifications`

Phone/email OTP for signup and login (FR1).

```sql
CREATE TABLE otp_verifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  VARCHAR(255) NOT NULL,   -- phone or email
  otp_hash    TEXT        NOT NULL,
  purpose     otp_purpose NOT NULL,
  attempts    SMALLINT    DEFAULT 0,
  verified    BOOLEAN     DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE otp_purpose AS ENUM ('REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'EMAIL_CHANGE');

CREATE INDEX idx_otp_identifier ON otp_verifications(identifier);
-- TTL cleanup: DELETE FROM otp_verifications WHERE expires_at < NOW();
```

---

### 2.3 `refresh_tokens`

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

### 2.4 `client_profiles`

One-to-one with `users` where `role = 'CLIENT'`.

```sql
CREATE TABLE client_profiles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
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
  preferred_language      VARCHAR(50)   DEFAULT 'en',
  profile_photo_url       TEXT,
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_minor ON client_profiles(is_minor) WHERE is_minor = TRUE;
```

**Conditional profile sections (FR4):** rather than a wide sparse table, category-specific fields (e.g., medical history for `MEDICAL`, jurisdiction for `LEGAL`) are stored per-category so the schema grows without migrations as new categories or fields are added:

```sql
CREATE TABLE client_category_profiles (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID               NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category    consultant_category NOT NULL,
  data        JSONB              NOT NULL DEFAULT '{}',  -- e.g., {"allergies": [...], "existing_conditions": [...]}
  created_at  TIMESTAMPTZ        DEFAULT NOW(),
  updated_at  TIMESTAMPTZ        DEFAULT NOW(),

  CONSTRAINT unique_client_category UNIQUE (client_id, category)
);

CREATE INDEX idx_client_category_profiles_client ON client_category_profiles(client_id);
CREATE INDEX idx_client_category_profiles_data ON client_category_profiles USING GIN (data);
```

---

### 2.5 `guardian_links`

Guardian/parent linkage and consent for minor clients (PRD §9.38). A minor may have more than one guardian.

```sql
CREATE TABLE guardian_links (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_client_id       UUID          NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  guardian_user_id      UUID          NOT NULL REFERENCES users(id),
  relationship          VARCHAR(50)   NOT NULL,   -- e.g., "Mother", "Legal Guardian"
  consent_given          BOOLEAN       DEFAULT FALSE,
  consent_document_url  TEXT,
  verified_at           TIMESTAMPTZ,
  verified_by           UUID          REFERENCES users(id),
  created_at             TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT unique_guardian_per_minor UNIQUE (minor_client_id, guardian_user_id)
);

CREATE INDEX idx_guardian_links_minor ON guardian_links(minor_client_id);
CREATE INDEX idx_guardian_links_guardian ON guardian_links(guardian_user_id);
```

---

### 2.6 `consultant_profiles`

One-to-one with `users` where `role = 'CONSULTANT'`.

```sql
CREATE TABLE consultant_profiles (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID          UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name                   VARCHAR(200)  NOT NULL,
  category                    consultant_category NOT NULL,   -- exactly one primary category (FR2)
  sub_specialization          VARCHAR(150),
  bio                         TEXT,
  qualifications              TEXT[],
  years_of_experience         SMALLINT,
  consultation_fee            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  currency                    VARCHAR(3)    DEFAULT 'INR',
  languages_spoken            TEXT[],
  timezone                    VARCHAR(50)   DEFAULT 'Asia/Kolkata',
  verification_status         verification_status DEFAULT 'VERIFIED',  -- self-attested, set at save time; no reviewer sets this (FR3)
  rating_avg                  NUMERIC(3,2)  DEFAULT 0.00,   -- cached, updated via trigger
  rating_count                INTEGER       DEFAULT 0,
  is_accepting_new_clients    BOOLEAN       DEFAULT TRUE,
  auto_approve_bookings       BOOLEAN       DEFAULT FALSE,  -- FR7
  payment_timing              payment_timing_pref DEFAULT 'PAY_ON_BOOKING', -- FR31
  payout_account_details      JSONB,                        -- encrypted column (pgcrypto) in production
  created_at                  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE consultant_category AS ENUM (
  'MEDICAL', 'LEGAL', 'IT', 'PHYSIOTHERAPY', 'HOMEOPATHY', 'ASTROLOGY'
);
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');  -- informational/display only; never gates bookability (see §3.2)
CREATE TYPE payment_timing_pref AS ENUM ('PAY_ON_BOOKING', 'PAY_AFTER_SESSION');

CREATE INDEX idx_consultant_profiles_user ON consultant_profiles(user_id);
CREATE INDEX idx_consultant_profiles_category ON consultant_profiles(category);
CREATE INDEX idx_consultant_profiles_verification ON consultant_profiles(verification_status);
CREATE INDEX idx_consultant_profiles_public
  ON consultant_profiles(category, is_accepting_new_clients, rating_avg DESC)
  WHERE is_accepting_new_clients = true;  -- optimizes public /book profile lookup
```

---

### 2.7 `consultant_verification_documents`

Tiered document requirements (PRD §9.42): Medical/Legal require license proof; Astrology/Homeopathy may only require identity verification. Multiple documents per consultant, self-attested and **never reviewed or approved by anyone** (no platform verification queue — FR3, `appflow_ayush.md` §4), with filenames preserved for UI display (PRD Open Question §11.4).

```sql
CREATE TABLE consultant_verification_documents (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id     UUID              NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  document_type     verification_doc_type NOT NULL,
  file_url          TEXT              NOT NULL,   -- Supabase bucket path
  file_name         VARCHAR(255)      NOT NULL,   -- original filename, shown in UI
  issuing_authority VARCHAR(255),
  issued_date       DATE,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE verification_doc_type AS ENUM (
  'MEDICAL_LICENSE', 'BAR_REGISTRATION', 'DEGREE_CERTIFICATE',
  'GOVERNMENT_ID', 'PROFESSIONAL_CERTIFICATE', 'OTHER'
);

CREATE INDEX idx_verification_docs_consultant ON consultant_verification_documents(consultant_id);
```

---

### 2.8 `availability_slots`

Recurring weekly templates plus date-specific overrides (FR6). Actual double-booking prevention happens at `appointments` (§2.10), since a recurring template can back many bookable instances.

> [!NOTE]
> `start_time` and `end_time` are timezone-naive `TIME` types. To expand slots safely across DST transitions, calculations must cast/evaluate these ranges using the consultant's explicit `timezone` from their profile.

```sql
CREATE TABLE availability_slots (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
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
  block_reason          TEXT,                         -- e.g., vacation
  version               INTEGER       NOT NULL DEFAULT 1, -- optimistic locking column
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT day_or_date CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

CREATE TYPE slot_status AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

CREATE INDEX idx_availability_consultant ON availability_slots(consultant_id);
CREATE INDEX idx_availability_specific_date ON availability_slots(specific_date) WHERE specific_date IS NOT NULL;
CREATE INDEX idx_availability_open ON availability_slots(consultant_id, status) WHERE status = 'OPEN';
```

---

### 2.9 `cases`

The Client–Consultant relationship container and timeline anchor. **Not unique per pair** — a client and consultant may have multiple concurrent cases if the matters genuinely differ (PRD §9.37).

```sql
CREATE TABLE cases (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID          NOT NULL REFERENCES client_profiles(id),
  consultant_id   UUID          NOT NULL REFERENCES consultant_profiles(id),
  category        consultant_category NOT NULL,  -- snapshot of consultant category at creation
  title           VARCHAR(200),                  -- e.g., "Contract Dispute — Vendor X"
  matter_key      VARCHAR(100),                  -- optional; distinguishes concurrent cases per client-consultant pair (Edge Case #37)
  status          case_status   DEFAULT 'ACTIVE',
  tags            TEXT[],
  opened_at       TIMESTAMPTZ   DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  closure_reason  TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TYPE case_status AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_consultant ON cases(consultant_id);
CREATE INDEX idx_cases_client_consultant ON cases(client_id, consultant_id);
CREATE UNIQUE INDEX uniq_cases_matter
  ON cases(client_id, consultant_id, matter_key)
  WHERE matter_key IS NOT NULL;
CREATE INDEX idx_cases_status ON cases(status);
```

---

### 2.10 `appointments`

```sql
CREATE TABLE appointments (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID          NOT NULL REFERENCES cases(id),
  client_id                 UUID          NOT NULL REFERENCES client_profiles(id),      -- denormalized for RLS/query speed
  consultant_id              UUID          NOT NULL REFERENCES consultant_profiles(id),  -- denormalized for RLS/query speed
  slot_id                    UUID          REFERENCES availability_slots(id),
  scheduled_start             TIMESTAMPTZ   NOT NULL,      -- always stored UTC (PRD §9.6)
  scheduled_end                TIMESTAMPTZ   NOT NULL,
  status                     appointment_status DEFAULT 'REQUESTED',
  rejection_reason           TEXT,
  reschedule_reason          TEXT,
  reschedule_proposed_by     UUID          REFERENCES users(id),
  reschedule_proposed_start  TIMESTAMPTZ,
  reschedule_proposed_end    TIMESTAMPTZ,
  reschedule_expires_at      TIMESTAMPTZ,               -- auto-expire window (PRD §9.5)
  mode                       appointment_mode NOT NULL DEFAULT 'VIDEO_EXTERNAL',
  meeting_link               TEXT,                      -- external Zoom/Meet link only (PRD §11.1)
  fee_amount                 NUMERIC(10,2),
  currency                   VARCHAR(3)    DEFAULT 'INR',
  payment_status             payment_status_enum DEFAULT 'UNPAID',
  cancellation_reason        TEXT,
  cancelled_by                UUID          REFERENCES users(id),
  cancelled_at                TIMESTAMPTZ,
  no_show_disputed           BOOLEAN       DEFAULT FALSE,
  no_show_flagged_by         UUID          REFERENCES users(id),
  request_expires_at         TIMESTAMPTZ,               -- consultant response SLA (PRD §9.4)
  created_at                 TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT valid_appointment_window CHECK (scheduled_end > scheduled_start)
);

CREATE TYPE appointment_status AS ENUM (
  'REQUESTED', 'APPROVED', 'RESCHEDULE_PROPOSED', 'RESCHEDULED',
  'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'
);
-- Auto-expiry of an unanswered REQUESTED appointment resolves to CANCELLED, not a
-- separate EXPIRED state — matches appflow_ayush.md §6.3 (Edge Case #4) and the
-- AppointmentStatus union in data_API_ayush.md §17.
CREATE TYPE appointment_mode AS ENUM ('IN_PERSON', 'AUDIO', 'VIDEO_EXTERNAL');
CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- Concurrency control: prevent two clients from booking the same consultant slot (PRD §9.1)
-- Enforced at the DB layer, not just UI checks — a partial unique index blocks the race.
CREATE UNIQUE INDEX uniq_active_consultant_slot
  ON appointments(consultant_id, scheduled_start)
  WHERE status IN ('REQUESTED', 'APPROVED', 'RESCHEDULE_PROPOSED');

CREATE INDEX idx_appointments_case ON appointments(case_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_consultant ON appointments(consultant_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_start);
CREATE INDEX idx_appointments_pending_expiry
  ON appointments(request_expires_at) WHERE status = 'REQUESTED';
```

---

### 2.11 `interactions`

A logged session/encounter — may or may not map 1:1 to an `appointment` (supports ad-hoc logging, FR11).

```sql
CREATE TABLE interactions (
  id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID              NOT NULL REFERENCES cases(id),
  appointment_id            UUID              REFERENCES appointments(id),   -- nullable
  consultant_id              UUID              NOT NULL REFERENCES consultant_profiles(id),
  type                       interaction_type  NOT NULL,
  occurred_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  raw_audio_url              TEXT,                       -- Supabase bucket, source of truth
  audio_duration_seconds      INTEGER,
  is_partial_capture          BOOLEAN           DEFAULT FALSE,  -- salvaged after crash/drop (PRD §9.12)
  transcript_text            TEXT,
  transcript_status           transcript_status DEFAULT 'NOT_APPLICABLE',
  transcript_language         VARCHAR(10),
  transcript_confidence       NUMERIC(3,2),               -- flags low-confidence output (PRD §9.13)
  notes_text                  TEXT,
  consent_given               BOOLEAN,                    -- NULL = not applicable/not asked (PRD §9.11)
  visibility                  interaction_visibility DEFAULT 'CONSULTANT_ONLY',
  is_deleted                  BOOLEAN           DEFAULT FALSE,   -- soft delete (PRD §9.16)
  deleted_at                  TIMESTAMPTZ,
  delete_recoverable_until    TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ       DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE interaction_type AS ENUM ('RECORDED_AUDIO', 'NOTE', 'FOLLOW_UP_CALL', 'MESSAGE');
CREATE TYPE transcript_status AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE interaction_visibility AS ENUM ('CONSULTANT_ONLY', 'SHARED_WITH_CLIENT');

CREATE INDEX idx_interactions_case ON interactions(case_id);
CREATE INDEX idx_interactions_appointment ON interactions(appointment_id);
CREATE INDEX idx_interactions_transcript_status ON interactions(transcript_status)
  WHERE transcript_status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_interactions_active ON interactions(case_id, occurred_at) WHERE is_deleted = FALSE;
-- Full-text search over notes/transcripts for timeline keyword search (FR22)
CREATE INDEX idx_interactions_fts ON interactions
  USING GIN (to_tsvector('english', coalesce(notes_text, '') || ' ' || coalesce(transcript_text, '')));
```

> Note: multi-speaker diarization is out of scope for v1 (PRD §11.5) — `transcript_text` assumes a single consultant speaker per recording.

---

### 2.12 `commitments`

Promises made — typically by consultant to client (FR17).

```sql
CREATE TABLE commitments (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID               NOT NULL REFERENCES cases(id),
  interaction_id UUID               REFERENCES interactions(id),
  made_by        commitment_party   NOT NULL,
  description    TEXT               NOT NULL,
  due_date       DATE               NOT NULL,
  status         commitment_status  DEFAULT 'PENDING',
  fulfilled_at   TIMESTAMPTZ,
  fulfilled_by   UUID               REFERENCES users(id),   -- audit: who marked it fulfilled (PRD §9.19)
  priority       commitment_priority DEFAULT 'MEDIUM',
  created_at     TIMESTAMPTZ        DEFAULT NOW(),
  updated_at     TIMESTAMPTZ        DEFAULT NOW()
);

CREATE TYPE commitment_party AS ENUM ('CONSULTANT', 'CLIENT');
CREATE TYPE commitment_status AS ENUM ('PENDING', 'IN_PROGRESS', 'FULFILLED', 'MISSED', 'CANCELLED');
CREATE TYPE commitment_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE INDEX idx_commitments_case ON commitments(case_id);
CREATE INDEX idx_commitments_due ON commitments(due_date) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_commitments_status ON commitments(status);
```

---

### 2.13 `tasks`

Action items, typically assigned to the client (FR18).

```sql
CREATE TABLE tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID        NOT NULL REFERENCES cases(id),
  interaction_id UUID        REFERENCES interactions(id),
  assigned_to    task_party  NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  due_date       DATE        NOT NULL,
  status         task_status DEFAULT 'OPEN',
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE task_party AS ENUM ('CLIENT', 'CONSULTANT');
CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'OVERDUE', 'CANCELLED');

CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE status IN ('OPEN', 'IN_PROGRESS');
CREATE INDEX idx_tasks_status ON tasks(status);
```

Reminder history is normalized rather than stored as an array on `tasks`, so it scales cleanly and supports multi-channel fallback (SMS/WhatsApp/email — PRD §9.20):

```sql
CREATE TABLE task_reminders (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID                 NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  channel     notification_channel NOT NULL,
  sent_at     TIMESTAMPTZ          DEFAULT NOW()
);

CREATE INDEX idx_task_reminders_task ON task_reminders(task_id);
```

---

### 2.14 `documents`

Append-only version chain — a re-upload creates a new row rather than overwriting (PRD §9.24).

```sql
CREATE TABLE documents (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID              NOT NULL REFERENCES cases(id),
  interaction_id      UUID              REFERENCES interactions(id),
  uploaded_by         document_party    NOT NULL,
  file_url            TEXT              NOT NULL,   -- Supabase bucket path
  file_name           VARCHAR(255)      NOT NULL,
  file_type           VARCHAR(50)       NOT NULL,   -- enforced against allow-list at app layer (PRD §9.23)
  file_size_bytes     BIGINT            NOT NULL CHECK (file_size_bytes > 0),
  category             document_category NOT NULL,
  version              INTEGER           NOT NULL DEFAULT 1,
  previous_version_id UUID              REFERENCES documents(id),
  scan_status          scan_status_enum  DEFAULT 'PENDING',   -- malware scan gate (PRD §9.23)
  access_level         document_access   DEFAULT 'PRIVATE_TO_CONSULTANT',
  shared_confirmed_by  UUID              REFERENCES users(id), -- explicit confirm step (PRD §9.25)
  shared_confirmed_at  TIMESTAMPTZ,
  is_deleted           BOOLEAN           DEFAULT FALSE,
  deleted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ       DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       DEFAULT NOW()
);

CREATE TYPE document_party AS ENUM ('CONSULTANT', 'CLIENT');
CREATE TYPE document_category AS ENUM ('PRESCRIPTION', 'REPORT', 'CONTRACT', 'ID_PROOF', 'OTHER');
CREATE TYPE scan_status_enum AS ENUM ('PENDING', 'CLEAN', 'INFECTED');
CREATE TYPE document_access AS ENUM ('PRIVATE_TO_CONSULTANT', 'SHARED_WITH_CLIENT');

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_previous_version ON documents(previous_version_id);
CREATE INDEX idx_documents_scan_pending ON documents(scan_status) WHERE scan_status = 'PENDING';
-- Documents are only ever readable once clean — enforced at query/RLS layer:
-- WHERE scan_status = 'CLEAN' AND is_deleted = FALSE
```

> Per PRD Open Question §11.2: the platform does not persist a separate durable copy — files live only as long as the client keeps them in their linked Supabase bucket; `documents` rows reference that bucket rather than owning a redundant store.

---

### 2.15 `ai_summaries`

> [!WARNING]
> **DEFERRED TO PHASE 5 / AI BACKLOG**
> The AI/RAG capabilities (summaries, scoped case recaps) are moved to the Phase 5 backlog. This table is not part of the initial core build phase.

```sql
CREATE TABLE ai_summaries (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID             NOT NULL REFERENCES cases(id),
  summary_type         ai_summary_type  NOT NULL,
  output_text          TEXT             NOT NULL,
  model_used            VARCHAR(100)     NOT NULL,
  consultant_feedback   ai_feedback,
  was_edited            BOOLEAN          DEFAULT FALSE,
  edited_text           TEXT,
  is_flagged            BOOLEAN          DEFAULT FALSE,  -- excluded from future RAG ground truth (PRD §9.27)
  generated_at          TIMESTAMPTZ      DEFAULT NOW(),
  created_at            TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TYPE ai_summary_type AS ENUM ('SESSION_RECAP', 'FULL_CASE_SUMMARY', 'ON_DEMAND_QUERY');
CREATE TYPE ai_feedback AS ENUM ('HELPFUL', 'NOT_HELPFUL');

CREATE INDEX idx_ai_summaries_case ON ai_summaries(case_id);
CREATE INDEX idx_ai_summaries_flagged ON ai_summaries(is_flagged) WHERE is_flagged = TRUE;
```

---

### 2.16 `chat_messages`

> [!WARNING]
> **DEFERRED TO PHASE 5 / AI BACKLOG**
> The AI chat scoping/history features are deferred to Phase 5. This table and the related citation records are not part of the initial core build phase.

AI assistant conversation log, hard-scoped per case (FR23).

```sql
CREATE TABLE chat_messages (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID       NOT NULL REFERENCES cases(id),
  user_id     UUID       NOT NULL REFERENCES users(id),
  role        chat_role  NOT NULL,
  content     TEXT       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE chat_role AS ENUM ('USER', 'ASSISTANT');

CREATE INDEX idx_chat_messages_case ON chat_messages(case_id, created_at);
```

**RAG scoping is enforced as a mandatory DB filter, not just a prompt instruction** (PRD §9.28) — every retrieval query issued by the RAG service must include `WHERE case_id = :caseId`, and this is additionally backed by Row-Level Security (§5).

Citations for both `ai_summaries` and `chat_messages` are normalized into one shared, polymorphic table — this avoids duplicating citation schema and keeps "show me the source" queries uniform:

```sql
CREATE TABLE rag_citations (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type      rag_citation_parent NOT NULL,
  parent_id        UUID                NOT NULL,   -- ai_summaries.id or chat_messages.id
  source_type      rag_source_type     NOT NULL,
  source_id        UUID                NOT NULL,   -- interactions.id or documents.id
  snippet          TEXT,                            -- retrieved excerpt shown to the user
  relevance_score  NUMERIC(4,3),
  created_at        TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE rag_citation_parent AS ENUM ('AI_SUMMARY', 'CHAT_MESSAGE');
CREATE TYPE rag_source_type AS ENUM ('INTERACTION', 'DOCUMENT');

CREATE INDEX idx_rag_citations_parent ON rag_citations(parent_type, parent_id);
CREATE INDEX idx_rag_citations_source ON rag_citations(source_type, source_id);
```

> If a source `interaction` is later deleted, its prior summaries are **not** retroactively invalidated; the citation row remains and the referenced source is resolved as "unavailable" at read time (PRD §9.31) — see trigger §3.5.

---

### 2.17 `notifications`

```sql
CREATE TABLE notifications (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                notification_type    NOT NULL,
  title                VARCHAR(200)         NOT NULL,
  body                TEXT                 NOT NULL,
  related_entity_type  VARCHAR(50),
  related_entity_id    UUID,
  channel              notification_channel NOT NULL,
  status                notification_status  DEFAULT 'PENDING',
  scheduled_for         TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ          DEFAULT NOW()
);

-- Naming matches the notification `type` values used in readme.md §6.13 and
-- data_API_ayush.md §13 (e.g. APPOINTMENT_REQUEST, not APPOINTMENT_REQUESTED).
-- ACCOUNT_VERIFIED/ACCOUNT_REJECTED are intentionally omitted — there is no
-- platform verification/approval workflow to trigger them (FR3).
CREATE TYPE notification_type AS ENUM (
  'APPOINTMENT_REQUEST', 'APPOINTMENT_APPROVED', 'APPOINTMENT_RESCHEDULE_PROPOSED',
  'APPOINTMENT_REJECTED', 'APPOINTMENT_CANCELLED',
  'COMMITMENT_DUE_SOON', 'COMMITMENT_MISSED',
  'TASK_DUE_SOON', 'TASK_OVERDUE',
  'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED',
  'DOCUMENT_UPLOADED', 'AI_SUMMARY_READY',
  'ACCOUNT_SUSPENDED'
);
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, status) WHERE status != 'READ';
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'PENDING';
```

### 2.18 `notification_preferences`

Per-user, per-type, per-channel opt-in/out (FR30).

```sql
CREATE TABLE notification_preferences (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type    NOT NULL,
  channel           notification_channel NOT NULL,
  is_enabled        BOOLEAN              DEFAULT TRUE,

  CONSTRAINT unique_pref UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
```

### 2.19 `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh_key  TEXT        NOT NULL,
  auth_key    TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

---

### 2.20 `payments`

```sql
CREATE TABLE payments (
  id                        UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id             UUID               NOT NULL REFERENCES appointments(id),
  client_id                  UUID               NOT NULL REFERENCES client_profiles(id),
  consultant_id               UUID               NOT NULL REFERENCES consultant_profiles(id),
  razorpay_order_id           VARCHAR(100)       UNIQUE,
  razorpay_payment_id         VARCHAR(100)       UNIQUE,
  amount                      NUMERIC(10,2)      NOT NULL CHECK (amount >= 0),
  currency                    VARCHAR(3)         DEFAULT 'INR',   -- India-only in v1 (PRD §9.34)
  status                      payment_txn_status DEFAULT 'CREATED',
  refund_amount                NUMERIC(10,2)      DEFAULT 0,
  refund_reason                TEXT,
  platform_fee                 NUMERIC(10,2),
  consultant_payout_amount     NUMERIC(10,2),
  payout_status                 payout_status_enum DEFAULT 'PENDING',
  payout_processed_at           TIMESTAMPTZ,
  webhook_received_at           TIMESTAMPTZ,        -- reconciliation marker (PRD §9.32)
  created_at                    TIMESTAMPTZ         DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ         DEFAULT NOW()
);

CREATE TYPE payment_txn_status AS ENUM ('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE payout_status_enum AS ENUM ('PENDING', 'BLOCKED', 'PROCESSED', 'FAILED');

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_consultant ON payments(consultant_id);
CREATE INDEX idx_payments_status ON payments(status);
-- Reconciliation job target: payments stuck CREATED with a confirmed order but no webhook
CREATE INDEX idx_payments_unreconciled
  ON payments(created_at) WHERE status = 'CREATED' AND webhook_received_at IS NULL;
```

### 2.21 `invoices`

Auto-generated per successful payment (FR34).

```sql
CREATE TABLE invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID        UNIQUE NOT NULL REFERENCES payments(id),
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  pdf_url         TEXT        NOT NULL,
  issued_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_payment ON invoices(payment_id);
```

---

### 2.22 `reviews`

```sql
CREATE TABLE reviews (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID          UNIQUE NOT NULL REFERENCES appointments(id),
  client_id       UUID          NOT NULL REFERENCES client_profiles(id),
  consultant_id   UUID          NOT NULL REFERENCES consultant_profiles(id),
  rating          SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_visible      BOOLEAN       DEFAULT TRUE,   -- moderation flag
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_reviews_consultant ON reviews(consultant_id);
CREATE INDEX idx_reviews_visible ON reviews(consultant_id) WHERE is_visible = TRUE;
```

---

### 2.23 `audit_logs`

Every access to sensitive case data, especially by Admin, is logged (PRD §8, §9.41).

```sql
CREATE TABLE audit_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id         UUID        NOT NULL REFERENCES users(id),
  action                VARCHAR(100) NOT NULL,   -- e.g., 'case.view.admin_override', 'kyc.approved'
  entity_type           VARCHAR(50),
  entity_id             UUID,
  access_justification   TEXT,                   -- required when actor is ADMIN viewing case content (PRD §9.41)
  ip_address             INET,
  metadata               JSONB,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_target ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 2.24 `case_deletion_requests`

Resolves the "right to be forgotten" vs. legal/medical record-retention conflict (PRD §9.40) via an explicit, policy-driven workflow rather than a hard delete.

```sql
CREATE TABLE case_deletion_requests (
  id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID                    NOT NULL REFERENCES client_profiles(id),
  case_id           UUID                    REFERENCES cases(id),   -- NULL = full-account request
  requested_at       TIMESTAMPTZ             DEFAULT NOW(),
  status              deletion_request_status DEFAULT 'PENDING',
  resolution         deletion_resolution,                          -- how it was actually resolved
  resolution_notes    TEXT,
  resolved_by          UUID                    REFERENCES users(id),
  resolved_at           TIMESTAMPTZ
);

CREATE TYPE deletion_request_status AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');
CREATE TYPE deletion_resolution AS ENUM ('FULL_DELETION', 'ANONYMIZED_RETAINED_RECORD', 'REJECTED_LEGAL_HOLD');

CREATE INDEX idx_deletion_requests_client ON case_deletion_requests(client_id);
CREATE INDEX idx_deletion_requests_status ON case_deletion_requests(status) WHERE status = 'PENDING';
```

---

## 3. Database Functions & Triggers

### 3.1 Auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: users, client_profiles, client_category_profiles, consultant_profiles,
-- availability_slots, cases, appointments, interactions, commitments, tasks,
-- documents, payments, reviews
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- (repeat per table listed above)
```

### 3.2 Enforce consultant is accepting bookings (FR3, FR7)

> Per FR3 (`readme.md`), `appflow_ayush.md` §4, and `architecture_ayush.md` §9.5, credentials are
> **self-attested with no platform verification queue** — a consultant record is active and
> bookable immediately after required profile fields are saved. Bookability is gated solely by
> the Consultant's own `is_accepting_new_clients` toggle, never by a `verification_status` review
> outcome (nothing in the system ever sets `verification_status` to `VERIFIED` via review, since
> there is no reviewer).

```sql
CREATE OR REPLACE FUNCTION check_consultant_accepting_bookings()
RETURNS TRIGGER AS $$
DECLARE
  v_accepting BOOLEAN;
BEGIN
  SELECT is_accepting_new_clients INTO v_accepting
  FROM consultant_profiles WHERE id = NEW.consultant_id;

  IF v_accepting IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Consultant % is not currently accepting bookings', NEW.consultant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_require_accepting_consultant
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_consultant_accepting_bookings();
```

This mirrors the `403 BOOKINGS_DISABLED` error code already defined in `data_API_ayush.md` §1.4.

### 3.3 Refresh consultant average rating

```sql
CREATE OR REPLACE FUNCTION refresh_consultant_avg_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_consultant_id UUID;
BEGIN
  v_consultant_id := COALESCE(NEW.consultant_id, OLD.consultant_id);

  UPDATE consultant_profiles
  SET rating_avg = (
        SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00) FROM reviews
        WHERE consultant_id = v_consultant_id AND is_visible = TRUE
      ),
      rating_count = (
        SELECT COUNT(*) FROM reviews
        WHERE consultant_id = v_consultant_id AND is_visible = TRUE
      )
  WHERE id = v_consultant_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_consultant_avg_rating();
```

### 3.4 Auto-expire reschedule proposal → cancel appointment (PRD §9.5)

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

### 3.5 Mark RAG source as unavailable without invalidating past summaries (PRD §9.31)

Handled by soft-delete on `interactions`/`documents` plus a read-time join — no destructive trigger needed. At query time:

```sql
SELECT c.*, 
  CASE WHEN i.is_deleted THEN 'SOURCE_UNAVAILABLE' ELSE 'AVAILABLE' END AS source_availability
FROM rag_citations c
LEFT JOIN interactions i ON c.source_type = 'INTERACTION' AND c.source_id = i.id
WHERE c.parent_id = :summaryId;
```

---

## 4. Scheduled Jobs (Cron)

| Job | Schedule | Description |
|---|---|---|
| Expire unanswered booking requests | Every 15 min | `UPDATE appointments SET status='CANCELLED', cancellation_reason='Consultant did not respond in time' WHERE status='REQUESTED' AND request_expires_at < NOW()` (PRD §9.4, `appflow_ayush.md` §6.3) |
| Expire unanswered reschedule proposals | Every 15 min | See §3.4 |
| Flag NO_SHOW appointments | Every 15 min | Mark `APPROVED` appointments as `NO_SHOW` after grace period past `scheduled_end` if session never started (PRD §9.7) |
| Mark commitments MISSED | Every hour | `UPDATE commitments SET status='MISSED' WHERE status IN ('PENDING','IN_PROGRESS') AND due_date < CURRENT_DATE` → triggers notification (PRD §9.18) |
| Mark tasks OVERDUE | Every hour | Same pattern for `tasks` |
| Commitment/task due-soon reminders | Every 30 min | Notify at configurable lead time (e.g., 24h) via enabled channels, respecting `notification_preferences` |
| Payment reconciliation | Every 10 min | Reconcile `payments` where `status='CREATED'` and `webhook_received_at IS NULL` against Razorpay API (PRD §9.32) |
| Consultant document expiry check | Daily | Flag `consultant_verification_documents` where `expiry_date < NOW()` and notify the consultant to re-upload; does not affect bookability, which is controlled solely by `is_accepting_new_clients` (FR3) |
| Interaction/document hard-delete sweep | Daily | Permanently remove soft-deleted rows past `delete_recoverable_until` |
| Document lifecycle/archival | Weekly | Move older documents to cold storage tier per consultant/client quota policy (PRD §9.26) |
| OTP cleanup | Hourly | Delete expired `otp_verifications` rows |
| Push subscription cleanup | Weekly | Remove subscriptions that returned HTTP 410 Gone |
| AI summary re-indexing | On interaction soft-delete | Recompute `source_availability` cache if materialized (optional optimization) |

---

## 5. Row-Level Security (Supabase / PostgreSQL)

Strict tenant isolation is a hard NFR (PRD §8): a consultant's queries must never return another consultant's case data, and clients must never see another client's data or a consultant's private notes.

```sql
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

> `auth.uid()` returns the Supabase **auth** user id, which is *not* the same value as
> `users.id` used as the FK throughout this schema (see `supabase-setup_ayushman.md` §"Auth ↔ App
> User Sync"). Every policy below goes through the `public.current_app_user_id()` helper defined
> there instead of comparing `auth.uid()` directly against `user_id`/`client_id`/`consultant_id`.

```sql
-- Example: a case is visible only to its client or its consultant.
-- Admin is deliberately NOT included here — see the note below the policies.
CREATE POLICY case_participant_access ON cases
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
    OR consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
  );

-- Interactions marked CONSULTANT_ONLY are invisible to the client even within a shared case
CREATE POLICY interaction_visibility_policy ON interactions
  FOR SELECT
  USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
    OR (
      visibility = 'SHARED_WITH_CLIENT'
      AND case_id IN (
        SELECT id FROM cases WHERE client_id IN (
          SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id()
        )
      )
    )
  );

-- Clients can query only tasks assigned to them (PRD §11.3) — never private notes
CREATE POLICY task_client_visibility ON tasks
  FOR SELECT
  USING (
    assigned_to = 'CLIENT'
    AND case_id IN (
      SELECT id FROM cases WHERE client_id IN (
        SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id()
      )
    )
    OR case_id IN (
      SELECT id FROM cases WHERE consultant_id IN (
        SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id()
      )
    )
  );

-- RAG retrieval is hard-scoped at the same layer — the vector store query and the
-- Postgres query both filter by case_id server-side, never trusting a prompt-supplied caseId.
CREATE POLICY chat_case_scope ON chat_messages
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE client_id IN (SELECT id FROM client_profiles WHERE user_id = public.current_app_user_id())
      UNION
      SELECT id FROM cases WHERE consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = public.current_app_user_id())
    )
  );
```

Admin `SELECT` access to case-level content (`cases`, `interactions`, `documents`, `ai_summaries`, `chat_messages`) is deliberately **not** granted by any of the policies above — per FR36 and edge case #41 (and `architecture_ayush.md` §9.4, `supabase-setup_ayushman.md` "Database Row-Level Security"), an admin dispute-resolution path instead calls a `SECURITY DEFINER` function that requires a non-null `access_justification`, writes to `audit_logs`, and only then returns rows.

---

## 6. Data Retention Policy

| Table | Retention | Notes |
|---|---|---|
| `users` (deleted) | PII zeroed after 30 days of deletion request | Except where legal hold applies |
| `cases` / `commitments` / `tasks` | While account is active; Medical/Legal may be anonymized-retained on deletion request | See `case_deletion_requests` for conflict resolution (Edge Case #40) |
| `interactions` (transcripts/notes) | Same as parent case / bucket lifecycle | Soft-delete recovery window: 30 days, then hard delete |
| `documents` | Not stored outside the linked Supabase bucket (PRD Open Question #2) | `documents` rows are references; deleting bucket objects removes file access |
| `chat_messages` / `ai_summaries` | 2 years | Flagged summaries retained for review but excluded from RAG ground truth |
| `audit_logs` | 7 years | Compliance requirement |
| `notifications` | 6 months | |
| `otp_verifications` | 24 hours | |
| `refresh_tokens` | Deleted on expiry | |
| `push_subscriptions` | Deleted on push failure (410 Gone) | |

---

## 7. Migration Strategy

- Schema changes managed via **Prisma Migrate** (development) and **`prisma migrate deploy`** (CI/CD).
- No destructive migrations without a prior backup snapshot.
- Zero-downtime pattern: add nullable columns first, backfill, then add `NOT NULL`/constraints in a follow-up migration.
- New `consultant_category` values (category expansion beyond the current six) are additive `ALTER TYPE ... ADD VALUE` migrations; `client_category_profiles.data` (JSONB) absorbs new category-specific fields without a schema migration at all.
- Migration files version-controlled under `/prisma/migrations/`.
