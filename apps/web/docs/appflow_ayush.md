# Ayushman — Application Flow Documentation

**Version**: 0.2.0
**Last Updated**: July 2026
**Source**: Derived from PRD v0.1 (Consultant Context & Client Relationship Platform)

---

## 1. Overview

This document describes every user journey, screen-by-screen flow, and system-level transition in Ayushman. Ayushman is a **single-consultant** platform: each deployment/account belongs to one Consultant, who uses it to manage their own Clients. It covers the **Client** and **Consultant** roles across all platform surfaces, for the six supported consultant categories: Medical, Legal, IT, Physiotherapy, Homeopathy, Astrology.

There is no consultant marketplace, no consultant discovery/search, and no platform Admin who reviews or verifies consultants. The Consultant is the sole owner/operator of their own instance and is responsible for their own profile and client relationships — there is no third-party approval gate before a Consultant can operate. As the practice scales, the Consultant can **invite org Admins** (staff) via `/settings/team` to help manage calendar, cases, and disputes — these are org-scoped staff, not additional Consultants.

Scope is limited to v1 as defined in the PRD: web only (responsive), no embedded video (external meeting links only), Razorpay (India-only) payments, no multi-consultant clinics (multiple Consultant identities), no consultant marketplace/discovery.

---

## 2. High-Level Navigation Map

```
                          ┌─────────────────────┐
                          │    Landing Page      │
                          │  (this Consultant's   │
                          │   public profile/      │
                          │   marketing page)     │
                          └────────┬────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                              │
              ┌─────▼──────┐               ┌──────▼──────┐
              │  Register   │               │    Login     │
              └─────┬──────┘               └──────┬──────┘
                    │                              │
              ┌─────▼──────────────────────────────▼──────┐
              │           Role Selection Screen            │
              │  (Client | Consultant — Consultant slot     │
              │   only selectable if not already claimed    │
              │   on this instance, see §3.1)               │
              └───────────┬────────────────────────┬───────┘
                          │                        │
               ┌──────────▼──────────────┐   ┌─────▼────────────────────┐
               │  Client Profile Setup    │   │  Consultant Profile Setup │
               │  (no discovery/search —  │   │  (category + profile      │
               │   client is signing up   │   │   fields → active         │
               │   with this Consultant   │   │   immediately, no admin   │
               │   directly)              │   │   review — see §4)        │
               └──────────┬───────────────┘   └─────────┬─────────────────┘
                          ▼                              ▼
               ┌──────────────────────────┐   ┌────────────────────────────┐
               │    Client Dashboard      │   │  Consultant Dashboard      │
               │                          │   │                            │
               │  My Cases                │   │  My Cases                  │
               │  Appointments             │   │  Appointment Requests      │
               │  Notifications            │   │  Availability              │
               │  Profile                  │   │  Commitments & Tasks       │
               │  Book a session ──────────┼─┐ │  Notifications             │
               └───────────────────────────┘ │ │  Profile / Payout          │
                                              │ └────────────────────────────┘
                                              └──► §6 Booking Flow
                                                   (direct — this
                                                    Consultant's own
                                                    published slots)
```

Within any Case, both roles share a **Case Timeline** surface (scoped differently per role — see §7 and §8).

---

## 3. Authentication Flows

### 3.1 New User Registration

```
[Landing / "Get Started"]
    │
    ▼
[Registration Page]
    │ ── Common Inputs (all roles): Full name, Email, Phone, Password (or OTP-only)
    │
    ▼
[Email/Phone exists check]
    │
    ├─[Duplicate]──► [Error: "Account already exists. Login?"]
    │
    ▼
[OTP sent to phone/email]
    │
    ▼
[Enter OTP] ──► [Verified]
    │
    ▼
[Role Selection Screen]
    │
    ├──[Client]──────► [Client Profile Setup] ──► [Client Dashboard]
    │        (Client is registering to work with THIS instance's
    │         Consultant directly — there is no consultant search/
    │         discovery step; see §5)
    │
    └──[Consultant]──► [Consultant slot already claimed on this
    │                    instance?]
    │                        │
    │                        ├─[Yes]──► [Error: "This instance already
    │                        │           has a Consultant. Contact them
    │                        │           directly to be added as a
    │                        │           Client."]
    │                        │
    │                        └─[No]───► [Consultant Registration Form]
                             │  Captured in the SAME registration flow —
                             │  no separate onboarding session required:
                             │
                             │  ── Category (exactly one, required first):
                             │      Medical | Legal | IT | Physiotherapy |
                             │      Homeopathy | Astrology
                             │  ── Full name, bio, sub-specialization,
                             │      years of experience
                             │  ── Consultation fee, currency,
                             │      languages spoken, timezone
                             │  ── Optional credential documents (tiered by
                             │      category — displayed on the Consultant's
                             │      own profile, self-attested — see §4):
                             │        Medical/Legal    → license number + license PDF + Qualification certificate pdf
                             │        Physio/IT        → qualification certificate(s) PDF
                             │        Astrology/Homeo  → identity doc + Qualification certificate pdf
                             │
                             ▼
                        [Document Upload Widget] (optional, self-service)
                             │  Client-side: file type/size validation
                             │  (PDF/JPG/PNG, max size per policy)
                             │
                             ▼
                        [Files uploaded to Supabase Storage bucket
                         (S3-compatible object storage)]
                             │  One object per document; bucket path is
                             │  private (not publicly listable)
                             │  Object path/signed URL reference saved on
                             │  the Consultant record (DB stores the
                             │  reference, not the binary)
                             │  Original file name preserved for display
                             │  (no OCR/content validation in v1)
                             │
                             ▼
                        [Complete Profile] ──► Consultant record active
                             immediately (no review/approval gate —
                             see §4)
                             │
                             ▼
                        [Consultant Dashboard]
```

Notes (FR1, FR2, FR3):
- Signup is email/phone + OTP or password; role is fixed at signup (Client or Consultant).
- Role cannot be changed post-signup in v1 (no dual Client+Consultant identity).
- Since this is a single-consultant platform, only one account per instance may hold the Consultant role; once claimed, subsequent signups can only select Client.
- For Consultants, all profile fields AND (optional) credential documents are collected within the Registration Page flow itself (extended multi-step form under one session).
- Registration is complete for a Consultant, and the dashboard/booking page is live, as soon as required profile fields are saved — there is no submission-for-review step and no pending/verified gate (see §4).
- Uploaded certificates/licenses are written to a Supabase Storage bucket (S3-compatible); only the object reference (path/signed URL) is persisted in the application database, never the raw file bytes. Bucket access is private and mediated server-side (see §11 for retention policy on account deletion).
- If OTP verification fails or the browser session is lost mid-upload, partially uploaded documents are retained against the draft Consultant record so the user is not forced to re-upload on retry.


### 3.2 Login Flow

```
[Login Page]
    │
    ├──[Email/Phone + Password]
    │        │
    │        ├─[Correct]──► [JWT issued]──► [Role-based redirect]
    │        │
    │        ├─[Wrong password, attempts 1-4]──► [Error: "Invalid credentials. N attempts remaining."]
    │        │
    │        └─[Wrong password, attempt 5]──► [Account locked 15 min]
    │                                          [Email sent: "Suspicious login attempt"]
    │
    ├──[Email/Phone + OTP]──► [OTP verified]──► [Role-based redirect]
    │
    └──[Forgot Password]
             │
             ▼
         [Enter email/phone]──► [Reset link/OTP sent (expires 1h)]
             │
             ▼
         [New password form]──► [Password updated]──► [Redirect to login]
```

Role-based redirect:
- `CLIENT` → Client Dashboard
- `CONSULTANT` → Consultant Dashboard (active immediately after registration, no pending/verification gate)

### 3.3 Session Management

```
[API Request]
    │
    ├─[Access token valid]──► [Process request]
    │
    └─[Access token expired]
             │
             ▼
         [Silent token refresh (background)]
             │
             ├─[Refresh token valid]──► [New access token issued]──► [Retry request]
             │
             └─[Refresh token expired]──► [Logout]──► [Login page]
                                           [Toast: "Session expired. Please log in again."]
```

All row-level access is additionally enforced server-side per request (§9), independent of client-side routing — a valid session never implies unrestricted data access.

---

## 4. Consultant Profile & Credentials Flow

Maps to FR2, FR3.

```
[Consultant Registration Form submitted] (§3.1 — category, profile fields,
 and optional credential documents already captured and uploaded to
 Supabase Storage during registration)
    │
    ▼
[Complete Profile]
    │  Consultant record active immediately — no review/approval
    │  step and no platform Admin involved
    │  Consultant Dashboard fully accessible; "Accept Bookings" is a
    │  self-toggle the Consultant controls (see §7.2), not gated by
    │  any external verification status
    │
    ▼
[Consultant Dashboard]
```

Document tiering by category (self-attested, captured at registration, §3.1, purely for display on the Consultant's own public profile — not reviewed or approved by anyone):
- **Medical / Legal** → license number + license PDF
- **Physiotherapy / IT** → qualification certificate(s) PDF
- **Astrology / Homeopathy** → identity doc (+ optional qualification certificate)

Consultants can edit their profile and re-upload/replace credential documents at any time from Profile → Credentials (new files supersede the prior object reference in the same Supabase Storage bucket). Publishing availability and being bookable is controlled entirely by the Consultant's own "Accept Bookings" toggle (§7.2) — there is no external gate.

---

## 5. Client Onboarding Flow

Maps to FR4.

A Client registering on this instance is registering directly with **this platform's single Consultant** — there is no consultant selection, search, or discovery step anywhere in this flow (see §6).

```
[Client Profile Setup]
    ├── All mandatory fields and optional fields are filled by the user in this page
    ├── Guardian mapping/linkage (required if DOB indicates minor, maps to guardian_links table — Edge Case #38)
    │
    ▼
[Client Dashboard] (base profile complete, implicitly linked to this
 instance's Consultant — no consultant selection required)
```

Category-specific profile sections (e.g., medical history) are **not** collected at signup. They appear as optional/conditional prompts the first time a client books a session with the Consultant, and are stored against the resulting Case rather than the base ClientProfile.

---

## 6. Booking Flow (Client-initiated)

Maps to FR5–FR10 and Edge Cases #1–#10.

There is no consultant discovery, search, or listing screen — the Client Dashboard links directly to this instance's one Consultant.

### 6.1 Consultant Profile & Entry Point

```
[Client Dashboard] ──► [Book a Session]
    │
    ▼
[Consultant Profile Page] (this instance's single Consultant)
    ├── Bio, qualifications, credential docs (viewable), rating, fee, languages
    └── [Book Appointment]
```

### 6.2 Booking Request

```
[Book Appointment]
    │
    ▼
[Slot Picker] — shows consultant's published OPEN slots
    │  Times displayed in client's local timezone; stored/transmitted in UTC
    │  (Edge Case #6)
    │
    ▼
[Confirm slot + optional message]
    │
    ▼
[Slot lock attempt] — DB-level unique/locking constraint on (slotId, status)
    │
    ├─[Lock fails — already taken]──► Toast: "Slot no longer available."
    │                                  Return to Slot Picker (Edge Case #1)
    │
    └─[Lock succeeds]──► [Appointment created: status = REQUESTED]
                          (or status = APPROVED directly if consultant
                           has auto-approve enabled — FR7)
                          │
                          ▼
                     [Payment step] (see §9) if consultant charges
                     pay-on-booking; otherwise deferred to post-session
                          │
                          ▼
                     Consultant notified (APPOINTMENT_REQUEST)
                     Client sees appointment as "Awaiting consultant response"
```

### 6.3 Consultant Response to Booking Request

```
[Consultant Dashboard] ──► [Appointment Requests]
    │
    [Request card: Client name, requested slot, message]
    │
    ├──[Approve]──► status = APPROVED
    │               Client notified (APPOINTMENT_APPROVED)
    │
    ├──[Propose Reschedule]
    │        │
    │        ▼
    │    [New time + mandatory reason]
    │        │
    │        ▼
    │    status = RESCHEDULE_PROPOSED
    │    Client notified (RESCHEDULE)
    │        │
    │        ▼
    │    [Client: Accept / Decline]
    │        │
    │        ├─[Accept]──► status = RESCHEDULED → APPROVED (new time locked)
    │        │
    │        ├─[Decline]──► status = REJECTED (client must rebook)
    │        │
    │        └─[No response within configurable window]──►
    │                 auto-expire → status = CANCELLED
    │                 Both parties notified (Edge Case #5)
    │
    └──[Reject]
             │
             ▼
        [Mandatory rejection reason]
             │
             ▼
        status = REJECTED
        Client notified with reason

[No consultant response within X hours/days]
    │
    ▼
Auto-expire request → CANCELLED
Client notified to rebook (Edge Case #4)
```

### 6.4 Cancellation

```
[Appointment: APPROVED]
    │
    ├──[Client cancels]──┐
    │                    ├─► Allowed up to configurable cutoff (e.g., 2h before)
    └──[Consultant cancels]┘   Mandatory reason
                             │
                             ▼
                        status = CANCELLED
                        Refund flow triggered if paid (see §9.2)
                        Other party notified
```

### 6.5 Availability Editing After Booking

```
[Consultant edits/removes Availability]
    │
    ├─[No existing bookings in that window]──► Slot updated directly
    │
    └─[Existing APPROVED appointment(s) in that window]──►
             Existing appointment(s) NOT silently cancelled (Edge Case #2)
             │
             ▼
        [Forced Reschedule/Cancel workflow] (§6.3 reschedule path)
        triggered per affected appointment; client notified of each
```

Blocking time (e.g., vacation) follows the same forced-reschedule path (Edge Case #8).

### 6.6 No-Show Handling

```
[Appointment scheduledStart time passes]
    │
    ├─[Neither party "Started Session"]──► after grace period,
    │                                       status = NO_SHOW
    │                                       Either party can flag/dispute (Edge Case #7)
    │
    └─[Session started by consultant]──► proceeds to §7 Session Flow
```

---

## 7. Consultant Flows

### 7.1 Consultant Dashboard

```
[Consultant Dashboard]
    │
    ├── [Header] Logo | "Hi, Dr. Rao" (Consultant name) | Notification bell | Profile avatar
    │
    │
    ├── [Deadlines Widget] (FR20)
    │     Upcoming + overdue Commitments/Tasks across all Cases
    │     Sortable by due date / priority
    │
    └── [Tab Panel]
          ├── [Appointment Requests] (default if any pending)
          ├── [My Cases] — list of active Cases, each opens Case Timeline
          ├── [Calendar] — weekly calendar view (§7.1.1)
          ├── [Availability] — manage recurring slots + date overrides
          └── [Payouts] — ledger view (§9.3)
```

### 7.1.1 Weekly Calendar View

Maps to FR20/FR6 area — visual companion to Appointment Requests and Availability.

Implementation: built on an open-source calendar UI library (e.g. **FullCalendar** — `@fullcalendar/react` with the `timeGridWeek` view — or an equivalent open-source alternative). The same component is reused on the Client side (§8.1.1) with a scoped/filtered data source.

```
[Calendar Tab]
    │
    ├── [Week view] (default) — Mon–Sun grid, current week highlighted,
    │        [< Prev] [Today] [Next >] navigation, [Week / Day] toggle
    │
    ├── Each day column shows compact event chips for that day:
    │        Appointments (color-coded by status: Requested / Approved /
    │        Completed / Cancelled) + blocked/override dates from Availability
    │
    └── [Click on a day] ──► [Day Overview Panel] (side drawer or modal)
             │
             ├── Header: full date (e.g. "Tue, 8 July 2026")
             ├── Chronological list of all appointments for that consultant
             │        on that day — time, client name, category/type,
             │        status badge, [View Case] shortcut
             ├── Empty state: "No appointments on this day."
             │        (reuses Empty States pattern — §12.2)
             └── [Close] — returns to week grid, selected day remains
                      highlighted
```

Notes:
- Clicking an event chip directly (not just the day cell) deep-links straight into that Appointment/Case rather than opening the Day Overview Panel.
- Calendar data is fetched per visible week range (lazy-loaded on navigation), not the full appointment history at once.
- Time zone displayed matches the Consultant's profile timezone (see §3.1 profile fields).

### 7.2 Availability Management

Maps to FR6.

```
[Availability Tab]
    ├── [Weekly recurring pattern] — day, start/end time, slot duration,
    │        buffer before/after, max bookings per slot
    ├── [Date-specific overrides] — one-off extra slots or blocked dates
    │        (DST transitions applied automatically to recurring slots — Edge Case #9)
    └── [Save] ──► Slots regenerated as OPEN going forward
                   (existing booked slots unaffected — see §6.5)
```

### 7.3 Session Flow

Maps to FR11–FR16 and Edge Cases #11–#17.

```
[Approved Appointment, time reached] ──► [Start Session]
    │  (or: [+ Log Ad-hoc Interaction] from a Case, not tied to any Appointment
    │   — e.g. a follow-up phone call, FR11)
    │
    ▼
[Session Screen]
    │
    ├── [Consent checkbox] — required before recording starts where
    │        legally required; recording disabled if declined (Edge Case #11)
    │
    ├── [Record Audio]
    │        │
    │        ▼
    │   [Recording in progress] (in-browser)
    │        │
    │        ├─[Stop]──► Audio uploaded to Supabase storage bucket
    │        │           transcriptStatus = PENDING
    │        │           │
    │        │           ▼
    │        │      [Async Whisper transcription job queued]
    │        │           │
    │        │           ├─[> 1hr audio]──► chunked upload/transcription,
    │        │           │                   progress indicator (Edge Case #14)
    │        │           │
    │        │           ├─[Success]──► transcriptStatus = COMPLETED
    │        │           │              Transcript attached to Interaction
    │        │           │              (single-speaker only — consultant
    │        │           │               speaks for transcription per v1
    │        │           │               scope; multi-speaker is a known
    │        │           │               limitation, Edge Case #15)
    │        │           │
    │        │           └─[Failure / low confidence]──►
    │        │                    transcriptStatus = FAILED
    │        │                    Consultant notified, can manually
    │        │                    edit/retype; original audio retained
    │        │                    as source of truth (Edge Case #13)
    │        │
    │        └─[Browser crash / network drop mid-recording]──►
    │                 Partial audio salvaged/uploaded where possible
    │                 Consultant notified of partial capture,
    │                 not silently dropped (Edge Case #12)
    │
    ├── [Notes] — free-text/rich-text, independent of or alongside recording
    │
    ├── [Upload Documents]
    │        │
    │        ▼
    │   [File picker] ──► type allow-list + size limit enforced ──►
    │        malware scan queued (scanStatus: PENDING → CLEAN/INFECTED)
    │        File not accessible until scan clears (Edge Case #23)
    │        │
    │        ├─[Re-upload of existing doc]──► stored as new version,
    │        │        previousVersionId links to prior — no overwrite
    │        │        (Edge Case #24)
    │        │
    │        └─[Visibility toggle: Consultant-only / Shared with client]
    │                 Explicit confirm step required before sharing
    │                 (Edge Case #25 — accidental exposure)
    │
    ├── [Log Commitment] — "I will send X by [date]", madeBy = CONSULTANT/CLIENT
    │
    ├── [Assign Task] — to client or self, with due date
    │
    └── [End Session] ──► Interaction saved to Case
                          Appointment status → COMPLETED (if tied to one)
                          All items appear on Case Timeline
```

Soft-delete applies to notes/recordings (recovery window before hard delete — Edge Case #16). Sensitive transcript content inherits the same confidentiality controls as written notes (Edge Case #17).

### 7.4 Case Timeline (Consultant View)

Maps to FR21–FR22.

```
[Case Timeline]
    │
    ├── [Filter bar] Event type (Appointment/Interaction/Commitment/
    │        Task/Document) | Date range | Keyword search
    │        (matches notes/transcript text)
    │
    └── [Chronological feed]
          Appointments, Interactions, Commitments, Tasks, Documents
          rendered as timeline cards, newest first
          Paginated/lazy-loaded for long histories
```

### 7.5 Commitments & Tasks Management

Maps to FR17–FR20, Edge Cases #18–#22.

```
[Commitment / Task created] (from Session Flow or directly on Case)
    │
    ▼
status = PENDING / OPEN
    │
    ├─[Due date reached, not completed]──►
    │        auto-flag MISSED (Commitment) / OVERDUE (Task)
    │        Consultant notified; client notified transparently if a
    │        consultant commitment was missed (Edge Case #18)
    │
    ├─[Marked fulfilled/done by consultant]──►
    │        status = FULFILLED / DONE, fulfilledAt/completedAt set
    │        (Client disputes have no built-in arbitration in v1 —
    │        audit trail is system of record, Edge Case #19)
    │
    └─[Case closed while open items remain]──►
             Blocked: explicit confirmation/resolution prompt required
             before closure (Edge Case #22)

[Dashboard Deadlines Widget]
    Aggregates across all Cases, sortable by due date/priority (FR20)
```

Client-assigned Tasks additionally fall back to SMS/WhatsApp/email notification channels, since not all clients check the platform regularly (Edge Case #20).

### 7.6 AI Assistant (RAG) — Consultant

> [!WARNING]
> **DEFERRED TO PHASE 5 / AI BACKLOG**
> The AI/RAG features (Ask AI chat panel, automated summaries, pre-appointment recaps) are moved to the Phase 5 backlog and are not part of the initial release.

Maps to FR23–FR27, Edge Cases #27–#31.

```
[Case Timeline] ──► [Ask AI]
    │
    ▼
[AI Chat Panel] (scoped to this Case only)
    │
    ├──[Free-form question]
    │        │
    │        ▼
    │   Retrieval hard-filtered by caseId at the query layer
    │   (not prompt-level only — Edge Case #28)
    │        │
    │        ▼
    │   [Answer with inline citations] → each claim links to source
    │   Interaction/Document (Edge Case #27)
    │        │
    │        ├─[Question asks for new medical/legal/diagnostic advice]──►
    │        │        AI declines, redirects: "This is a summary of your
    │        │        own recorded judgment — please make the clinical/
    │        │        legal call yourself." (Edge Case #29, FR27 disclosure
    │        │        shown persistently in panel)
    │        │
    │        └─[thumbs up/down on response]──►
    │                 down-vote logs to review queue;
    │                 flagged responses excluded from being reused as
    │                 ground truth elsewhere (Edge Case #27, FR26)
    │
    └──[Generate Session Recap] (one-click, pre-appointment) — FR25
             │
             ▼
        Structured summary: what happened, commitments (by whom),
        open tasks, key documents
             │
             ▼
        Long case histories: hierarchical summarization
        (per-session summaries → summary-of-summaries, Edge Case #30)
```

If a source Interaction is later deleted, existing AI summaries generated from it are retained as historical snapshots with the source marked deleted/unavailable, rather than retroactively invalidated (Edge Case #31).

---

## 8. Client Flows

### 8.1 Client Dashboard

```
[Client Dashboard]
    │
    ├── [Header] Logo | "Hi, Priya" | Notification bell | Profile avatar
    │
    └── [Tab Panel]
          ├── [My Appointments] — Requested / Approved / Completed / Cancelled
          ├── [Calendar] — weekly calendar view (§8.1.1)
          ├── [My Cases] — one per Consultant relationship (or per matter,
          │        Edge Case #37), opens Case Timeline (client view)
          └── [Book a Session] ──► §6.1 Booking flow (directly with
                   this instance's Consultant — no discovery/search)
```

### 8.1.1 Weekly Calendar View

Same calendar component as the Consultant side (§7.1.1), reused with a client-scoped data source.

```
[Calendar Tab]
    │
    ├── [Week view] (default) — Mon–Sun grid, current week highlighted,
    │        [< Prev] [Today] [Next >] navigation, [Week / Day] toggle
    │
    ├── Each day column shows compact event chips for the client's own
    │        appointments that day — color-coded by status
    │        (Awaiting response / Confirmed / Completed / Cancelled)
    │
    └── [Click on a day] ──► [Day Overview Panel] (side drawer or modal)
             │
             ├── Header: full date (e.g. "Tue, 8 July 2026")
             ├── Chronological list of all appointments the client has
             │        on that day — time, consultant name, category,
             │        status badge, [View Case] shortcut
             ├── Empty state: "No appointments on this day."
             │        (reuses Empty States pattern — §12.2)
             └── [Close] — returns to week grid, selected day remains
                      highlighted
```

### 8.2 Appointment Lifecycle (Client Side)

Covered functionally in §6.2–§6.4. Client-facing states surfaced as:
`Awaiting response` (REQUESTED) → `Confirmed` (APPROVED) → `Reschedule proposed`
(action required) → `Completed` / `Cancelled` / `Rejected` / `No-show`.

### 8.3 Case Timeline (Client View — restricted)

Maps to FR28 and PRD Open Question #3.

```
[Case Timeline — Client]
    │
    ├── Appointments (own)
    ├── Documents explicitly marked SHARED_WITH_CLIENT
    ├── Tasks assigned to the client (own tasks only — not consultant's
    │        internal tasks or private notes)
    └── AI Summaries explicitly shared by consultant (if enabled per
             consultant setting) — client CANNOT query the AI directly
             against consultant's private notes; view-only, pre-generated
             summaries only
```

Consultant-authored private notes and raw transcripts are never visible to the client, regardless of Case state.

### 8.4 Reviews

```
[Appointment status → COMPLETED]
    │
    ▼
[Review prompt] (client dashboard, next visit)
    ├── Star rating (1–5)
    ├── Optional comment
    └── [Submit] ──► Review stored, subject to moderation flag (isVisible)
                     Consultant's ratingAvg/ratingCount updated
```

---

## 9. Payment Flow (Razorpay)

Maps to FR31–FR34, Edge Cases #32–#36. India-only; no multi-currency in v1.

### 9.1 Payment Capture

```
[Booking confirmed / session starting] (per consultant's pay-on-booking
 vs pay-after-session setting)
    │
    ▼
[Razorpay order created] ──► [Checkout widget]
    │
    ├─[Payment succeeds]──► Webhook received ──► paymentStatus = PAID
    │        Appointment marked APPROVED-and-paid (if pay-on-booking)
    │        Invoice/receipt auto-generated (FR34)
    │
    ├─[Payment fails]──► paymentStatus = UNPAID
    │        Client prompted to retry
    │
    └─[Payment succeeds but webhook fails to reach platform]──►
             Reconciliation job periodically checks Razorpay status
             against internal records; corrects stuck UNPAID state
             (Edge Case #32)
```

### 9.2 Refunds & Disputes

```
[Cancellation before cutoff]──► Full refund, automated
[Cancellation after session start]──► No refund by default policy
    │
    └─[Client disputes]──► Raised against the Case; resolved by the
             Consultant or org Admin (Edge Cases #33, #35)
             │
             ▼
        [Consultant/org-Admin-mediated partial/full refund override]
        (manual, not automated — applied from Case/Payouts or Disputes view)
```

### 9.3 Consultant Payouts

```
[Consultant Payouts Tab]
    Ledger: gross fee − platform commission, per Appointment
    │
    ├─[Payout account details valid]──► Disbursement (manual/batched in v1)
    │
    └─[Payout account missing/invalid]──►
             Payout blocked, consultant notified,
             transaction record retained, not lost (Edge Case #36)
```

---

## 10. Notification Flow

Maps to FR29–FR30.

```
[Server event occurs]
   (APPOINTMENT_REQUEST | APPOINTMENT_APPROVED | RESCHEDULE |
    COMMITMENT_DUE | TASK_DUE | TASK_OVERDUE | PAYMENT_RECEIVED |
    DOCUMENT_UPLOADED | AI_SUMMARY_READY)
    │
    ├──► [In-app notification] — stored, real-time badge update
    │
    ├──► [Email] — via configured provider
    │
    ├──► [SMS / WhatsApp] — via Twilio, primarily for clients unlikely
    │         to check the platform (older demographics in Astrology/
    │         Homeopathy — Edge Case #20)
    │
    └──► [Push] — web push, deep-links to relevant page

[Notification Center]
    ├── Header: "Notifications" | [Mark all as read]
    ├── Grouped: Today | Yesterday | This Week | Older
    └── [Load more] (pagination, 20 per page)

[Notification Preferences]
    Per-user, per-channel opt-in/opt-out (FR30)
```

Commitment/Task due-soon lead time is configurable (default 24h).

---

## 11. Account & Data Management

Maps to FR35–FR36, Edge Cases #38–#40. There is no **platform** Admin role — account- and data-level actions are handled by the Consultant (practice owner), invited **org Admins** (staff), or direct system policy.

### 11.1 Org Admin Team Management

```
[Consultant Dashboard] ──► [Settings → Team]
    │
    ├─[Invite Admin] ──► POST /org/admins/invite { email }
    │       Invitee signs up with role=ADMIN (cannot claim CONSULTANT slot)
    │
    └─[Revoke Admin] ──► DELETE /org/admins/:userId
            Org Admin loses delegated access immediately
```

Org Admins share operational access: appointment requests, calendar, client cases, disputes, payouts. They have no default access to raw clinical/legal notes unless a dispute workflow grants justified, logged access (§11.2).

### 11.2 Sensitive-Content Access

```
[Case contains sensitive content] (clinical/legal notes, transcripts)
    │
    ▼
Visible only to the Consultant who authored it and, where explicitly
shared, the Client it belongs to (§8.3)
    │
    ▼
All access is logged to an AuditLog (actorUserId, action, entityId,
timestamp, metadata) for the Consultant's own record-keeping —
there is no third-party Admin reviewer; access control is purely
Consultant-authorship + explicit-share based, never unrestricted
default visibility.
```

### 11.3 Consultant Account Closure / Data Retention

```
[Consultant closes/deletes their account]
    │
    ▼
Client retains access to own historical Case data (timeline, documents)
even though the Consultant account is deactivated (Edge Case #39)

[Client requests full data deletion]
    │
    ├─[No conflicting retention obligation]──► Full deletion processed
    │
    └─[Consultant category has legal/medical retention obligation]──►
             Client-identifying fields anonymized; clinical/legal
             record retained per policy — not a full delete
             (Edge Case #40, PRD Open Question #2: no files stored
             beyond the client's linked Supabase bucket lifetime)
```

Minor clients require guardian/parent account linkage and consent handling at profile creation, not just a flagged DOB field (Edge Case #38).

---

## 12. Error & Fallback States

### 12.1 API Error Handling (Client)

| HTTP Status | User-facing message | Behavior |
|-------------|---------------------|---------|
| 400 | "Please check your input and try again." | Inline errors shown |
| 401 | "Session expired. Please log in." | Redirect to login |
| 403 | "You don't have permission to do this." | Toast, stay on page |
| 404 | "Not found." | Show 404 page |
| 409 | "This slot is no longer available." / other conflict reason | Toast with reason |
| 422 | Specific validation message | Field-level errors |
| 429 | "Too many requests. Please wait a moment." | Toast + retry-after shown |
| 500 | "Something went wrong on our end. Please try again." | Toast + report option |
| Network offline | "You're offline. Check your connection." | Offline banner |

### 12.2 Empty States

| Screen | Empty state message | CTA |
|--------|---------------------|-----|
| My Cases (Client) | "No cases yet. Book your first consultation." | [Book a Session] |
| My Cases (Consultant) | "No active cases yet." | — |
| Appointment Requests | "No pending requests." | — |
| Availability | "No slots published yet." | [Set Up Availability] |
| Case Timeline | "Nothing logged yet for this case." | — |
| Deadlines Widget | "No upcoming or overdue items." | — |
| AI Chat | "Ask me to recap this case or summarize what's happened so far." | — |
| Notifications | "You're all caught up!" | — |

### 12.3 Loading / Async States

- Skeleton screens for all list/card/timeline components (not spinners).
- Transcription and AI summarization are background jobs — visible status (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`), never a blocking UI wait.
- Full-page loader only on initial auth check.

---

## 13. Screen Inventory

| Screen | Route | Auth Required | Role |
|--------|-------|---------------|------|
| Landing | `/` | No | — |
| Register | `/register` | No | — |
| Login | `/login` | No | — |
| Role Selection | `/onboarding/role` | Yes | Any |
| Client Profile Setup | `/onboarding/client` | Yes | Client |
| Consultant Profile Setup | `/onboarding/consultant` | Yes | Consultant |
| Client Dashboard | `/dashboard` | Yes | Client |
| Consultant Dashboard | `/consultant` | Yes | Consultant |
| Consultant Profile (public, this instance's one Consultant) | `/book` | No | — |
| Booking Flow | `/book/appointment` | Yes | Client |
| Calendar (Client) | `/calendar` | Yes | Client |
| Appointment Requests | `/consultant/requests` | Yes | Consultant |
| Calendar (Consultant) | `/consultant/calendar` | Yes | Consultant |
| Availability Management | `/consultant/availability` | Yes | Consultant |
| Case Timeline (Consultant view) | `/cases/:caseId` | Yes | Consultant |
| Case Timeline (Client view) | `/my-cases/:caseId` | Yes | Client |
| Session / Interaction Logging | `/cases/:caseId/session/:appointmentId?` | Yes | Consultant |
| AI Assistant Panel | `/cases/:caseId/ai` | Yes | Consultant, Client (shared summaries only) |
| Commitments & Tasks (dashboard widget) | `/consultant/deadlines` | Yes | Consultant |
| Payments / Checkout | `/appointments/:id/pay` | Yes | Client |
| Payouts Ledger | `/consultant/payouts` | Yes | Consultant |
| Notifications | `/notifications` | Yes | Any |
| Team Management | `/settings/team` | Yes | Consultant |
| Audit Log | `/settings/audit-log` | Yes | Consultant, Org Admin |
| Disputes | `/settings/disputes` | Yes | Consultant, Org Admin |
| Profile | `/profile` | Yes | Any |
| 404 | `*` | No | — |
| 500 | — | No | — |

---

## 14. Explicitly Out of Scope for This Flow Document (v1)

Per PRD §4 — not represented above:
- Consultant marketplace, consultant discovery/search, or consultant listing surfaces (platform is single-consultant per instance)
- Platform Admin role / cross-tenant verification-and-approval workflow
- Multi-consultant clinics (multiple Consultant identities per instance)
- Native mobile app flows (responsive web only)
- Insurance billing / claims flows
- E-prescription / e-signature flows
- In-platform video calling (external meeting links added by consultant, joined by client — link stored on the Appointment, call itself not hosted)
- Non-INR / non-Razorpay payment rails
- Group/family session flows
