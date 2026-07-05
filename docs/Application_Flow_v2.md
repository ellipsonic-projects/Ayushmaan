# Ayushman — Application Flow Documentation

**Version**: 0.3.0 (Multi-Tenant Edition)
**Last Updated**: July 2026
**Source**: Derived from PRD v0.2 — *Consultant Context & Client Relationship Platform ("Ayushman") — Multi-Tenant Edition*
**Supersedes**: Application Flow v0.2.0 (single-consultant)

## 1. Overview

This document describes every user journey, screen-by-screen flow, and system-level transition in Ayushman across all four roles, for the six supported consultant categories (Medical, Legal, IT, Physiotherapy, Homeopathy, Astrology), across every tenant.

Scope remains v1/v2 as defined in the PRD: web only (responsive), no embedded video (external meeting links only), Razorpay (India-only) payments, tenant provisioning is Super-Admin-initiated only (no fully self-serve tenant signup in this version).

---

## 2. High-Level Navigation Map

```
                                   ┌─────────────────────────────┐
                                   │   admin.ayushman.app         │
                                   │   Super Admin Console        │
                                   │   (platform tier, global)     │
                                   └───────────────┬───────────────┘
                                                   │ creates/suspends
                                                   ▼
                                   ┌─────────────────────────────┐
                                   │      {tenant-slug}.ayushman.app       │
                                   │   Tenant subdomain (resolved   │
                                   │   in Next.js middleware)      │
                                   └───────────────┬───────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
             ┌──────▼──────┐              ┌────────▼────────┐            ┌────────▼────────┐
             │ Public Site  │              │  Tenant Admin    │            │   Consultant      │
             │ (landing,    │              │  Back-Office     │            │   Workspace       │
             │  book, login)│              │  (admin)         │            │   (consultant)    │
             └──────┬──────┘              └────────┬────────┘            └────────┬────────┘
                    │                              │                              │
             ┌──────▼──────┐                       │                              │
             │   Register /  │                       │                              │
             │   Login       │                       │                              │
             └──────┬──────┘                       │                              │
                    │                              │                              │
             ┌──────▼──────┐                       │                              │
             │ Client        │                       │                              │
             │ Dashboard     │                       │                              │
             │ (client)      │                       │                              │
             └───────────────┘                       │                              │

  Tenant Admin manages:                       Consultant manages:
    - Consultants (CRUD)                        - My Clients (search, pin, CRM tags)
    - Branding / Settings                        - Case Timeline / Sessions
    - Billing / Payouts config                   - Availability / Out-of-Office
    - Disputes (payment/no-show)                 - Commitments & Tasks
    - Tenant-scoped Audit Log                    - Referrals (cross-consultant)
                                                  - AI Assistant (per Case)

  Client manages:                              Super Admin manages:
    - Book a Session (this tenant's              - Tenants (create/suspend/delete)
      Consultant list)                           - Billing/Subscriptions per tenant
    - My Cases / My Appointments                 - Global Audit Log
    - My Tasks                                   - Grievance inbox (cross-tenant)
    - Report a Concern (Grievance) — always
      visible, cannot be hidden by tenant
    - Refer a friend
```

A user's `tenantId` is stamped on their JWT at sign-in and is never client-suppliable — the subdomain a person is on, plus their token's `tenant_id` claim, together determine what they can see. A token whose `tenant_id` doesn't match the subdomain triggers a "wrong tenant" redirect at login (§3.2).

Within any Case, `CONSULTANT` and `CLIENT` share a **Case Timeline** surface (scoped differently per role — see §9 and §10). `TENANT_ADMIN` can reach a Case only through a logged escalation path (§12.2), never by default.

---

## 3. Authentication & Tenant Resolution Flows

### 3.1 Tenant Provisioning (Super Admin-initiated only)

Self-serve tenant signup is **out of scope** for this version — a practice cannot sign itself up. Only a `SUPER_ADMIN` can create a tenant.

```
[Super Admin Console] ──► [Tenants] ──► [Create Tenant]
    │
    ▼
[Form: slug (subdomain), display name, plan tier, default currency,
 initial Tenant Admin email]
    │
    ▼
[Tenant row created] status = ACTIVE
    │
    ▼
[Default TENANT_ADMIN account provisioned]
    (admin@{slug}.ayushman.app pattern, or the email supplied)
    │
    ▼
[Invite email sent to Tenant Admin] ──► [Tenant Admin sets password]
    │
    ▼
[Tenant Admin First-Login Onboarding Wizard] (§4.1)
```

A `SUSPENDED` or unknown tenant subdomain is intercepted in middleware before any page loads, and shown a branded "this practice is unavailable" page rather than a generic 404.

### 3.2 New User Registration (Consultant / Client — tenant-scoped)

```
[Tenant Public Site — "Get Started"]
    │
    ▼
[Registration Page] (tenant-scoped: {slug}.ayushman.app/register)
    │ ── Common Inputs: Full name, Email, Phone, Password (or OTP-only)
    │
    ▼
[Email/Phone exists check — scoped to this tenant]
    │
    ├─[Duplicate within tenant]──► [Error: "Account already exists. Login?"]
    │
    ▼
[OTP sent to phone/email]
    │
    ▼
[Enter OTP] ──► [Verified]
    │
    ▼
[Role Selection]
    │
    ├──[Client]──────► [Client Profile Setup] (§6) ──► [Client Dashboard]
    │        Conditional profile sections shown per category only if
    │        booking that category (e.g. medical history only if
    │        booking a Medical Consultant)
    │
    └──[Consultant]──► Can a new Consultant self-register on the public
                         site at all?
                         │
                         NO — per the PRD's role/tenancy model, Consultants
                         are created BY the Tenant Admin (§4.2 CRUD), not
                         via public self-registration. A person invited as
                         a Consultant receives an invite link that lands
                         them directly on:
                         │
                         ▼
                    [Consultant Onboarding Wizard] (§5.1) — category,
                    sub-specialization, qualifications/license upload,
                    bio, fee, languages
                         │
                         ▼
                    [Consultant Workspace]
```

Notes:
- Role is fixed at signup for `CLIENT`; a `CLIENT` account is scoped to one tenant (per PRD Open Point #2 — a Client identity does not span tenants in this version; a person using two different practices needs two separate logins, one per subdomain).
- `CONSULTANT` accounts are never self-registered from the public site — they are always invited by a `TENANT_ADMIN` (§4.2). This replaces the v0.2.0 "claim the Consultant slot" flow, since a tenant may now hold many Consultants.
- Uploaded certificates/licenses are written to Supabase Storage under a `{tenantId}/{caseId or consultantId}/...` path prefix; only the object reference is persisted in the database, never raw file bytes; signed URLs are generated per-request and scoped to that prefix only.

### 3.3 Login Flow (role-aware, tenant-aware)

```
[Login Page] ({slug}.ayushman.app/login, or admin.ayushman.app/login
 for Super Admin)
    │
    ├──[Email/Phone + Password]
    │        │
    │        ├─[Correct]──► [JWT issued with tenant_id + role claims]
    │        │              │
    │        │              ├─[Token's tenant_id matches this subdomain,
    │        │              │  or user is SUPER_ADMIN (tenant_id: null)]
    │        │              │  ──► [Role-based redirect]
    │        │              │
    │        │              └─[Token's tenant_id does NOT match this
    │        │                 subdomain]──► [Error: "This account
    │        │                 belongs to a different practice. Go to
    │        │                 {correct-slug}.ayushman.app?"]
    │        │
    │        ├─[Wrong password, attempts 1-4]──► [Error: "Invalid
    │        │        credentials. N attempts remaining."]
    │        │
    │        └─[Wrong password, attempt 5]──► [Account locked 15 min]
    │                                          [Email sent: "Suspicious
    │                                           login attempt"]
    │
    ├──[Email/Phone + OTP]──► [OTP verified]──► [Role-based redirect]
    │
    └──[Forgot Password]
             │
             ▼
         [Enter email/phone]──► [Reset link/OTP sent (expires 1h),
                                  tenant-branded email template]
             │
             ▼
         [New password form]──► [Password updated]──► [Redirect to login]
```

Role-based redirect:
- `SUPER_ADMIN` → Super Admin Console (`admin.ayushman.app/dashboard`)
- `TENANT_ADMIN` → Tenant Admin Back-Office (`{slug}.ayushman.app/admin/dashboard`)
- `CONSULTANT` → Consultant Workspace (`{slug}.ayushman.app/consultant/dashboard` — morning briefing view, §7.1)
- `CLIENT` → Client Dashboard (`{slug}.ayushman.app/dashboard`)

### 3.4 Session Management & Tenant Isolation Enforcement

```
[API Request]
    │
    ▼
[Middleware resolves tenant from subdomain, injects into request context]
    │
    ▼
[App sets Postgres session var app.tenant_id from the JWT's tenant_id
 claim — never from a client-supplied header or query param]
    │
    ├─[Access token valid]──► [Row-Level Security: USING (tenant_id =
    │        current_setting('app.tenant_id')::uuid)] ──► [Process request]
    │        (SUPER_ADMIN tokens carry is_super_admin: true, explicitly
    │         checked by RLS policies to bypass the tenant filter — every
    │         such bypass read still writes an AuditLog entry, §12.1)
    │
    └─[Access token expired]
             │
             ▼
         [Silent token refresh (background)]
             │
             ├─[Refresh token valid]──► [New access token issued]──►
             │                          [Retry request]
             │
             └─[Refresh token expired]──► [Logout]──► [Login page]
                                           [Toast: "Session expired.
                                            Please log in again."]
```

A valid session never implies unrestricted data access — RLS is enforced server-side per request, independent of client-side routing, on every tenant-scoped table (`Case`, `Appointment`, `Interaction`, `Commitment`, `Task`, `Document`, `Payment`, `Notification`, `AuditLog`, etc.).

---

## 4. Super Admin Flows (Platform Tier)

Maps to PRD §1, §5 Phase 1.

### 4.1 Tenant Management

```
[Super Admin Console] ──► [Tenants]
    │
    ├── [List/search all tenants] — filter by status (ACTIVE/SUSPENDED/
    │        ARCHIVED)
    │
    ├── [Create Tenant] (§3.1)
    │
    └── [Open a tenant] ──► [Single-Tenant Deep View]
             ├── Usage stats, billing status, staff list
             ├── [Suspend] / [Reinstate] / [Delete] tenant
             └── [View Tenant Data] (escalation button)
                      │  Reason field mandatory
                      ▼
                 AuditLog entry written (actor, tenant, entity, reason)
                      │
                      ▼
                 Read-only cross-tenant data access granted for this
                 session (unrestricted ≠ invisible)
```

### 4.2 Platform Dashboard, Billing & Global Audit Log

```
[Super Admin Console] ──► [Dashboard]
    Cross-tenant KPIs: active tenants, MRR, bookings this week,
    transcription queue health, flagged disputes needing platform
    attention

[Super Admin Console] ──► [Billing]
    Subscription/plan management per tenant, commission rates,
    invoice history

[Super Admin Console] ──► [Audit Log]
    Global, filterable audit trail across all tenants (platform-only view)

[Super Admin Console] ──► [Settings]
    Platform-wide config: supported categories list, global
    notification provider keys (Twilio/Resend), feature flags per
    plan tier
```

### 4.3 Grievance Inbox (Cross-Tenant)

See §11 for the full Client-side grievance flow. Super Admin side:

```
[Super Admin Console] ──► [Grievances]
    │
    ├── [Global inbox] — filter by tenant / category / severity / status
    │        Newly submitted grievances trigger in-app + email
    │        notification to Super Admin; SMS as well if
    │        severity = CRITICAL
    │
    ├── [Assign to self] / [Bulk-triage]
    │
    └── [Open a grievance] ──► [Detail view]
             ├── Full description, attachments
             ├── Linked Case (if any) — opened via logged escalation
             │        access (writes AuditLog, same mechanism as §4.1)
             ├── [Set severity] LOW / MEDIUM / HIGH / CRITICAL
             ├── [Mark status] OPEN → UNDER_REVIEW → RESOLVED / DISMISSED
             ├── [Resolution notes]
             └── [Resolve/Dismiss] ──► Client notified of status change
                      (GRIEVANCE_STATUS_CHANGED — to the submitting
                       Client only; the Tenant Admin and Consultant of
                       that tenant are never notified and never see
                       this queue, in any form)
```

A grievance about the platform or Super Admin itself needs an
out-of-band channel (fixed external support email) since routing it
to Super Admin's own inbox defeats the purpose — see §11.3.

---

## 5. Tenant Admin Flows

Maps to PRD §5 Phase 2.

### 5.1 Tenant Admin First-Login Onboarding Wizard

```
[Invite accepted] ──► [Set password]
    │
    ▼
[Onboarding Wizard]
    ├── Branding: logo, theme colors, display name
    ├── Business hours defaults
    ├── Payout account details
    └── [Add first Consultant] ──► §5.2 invite flow
    │
    ▼
[Tenant Admin Back-Office Dashboard]
```

### 5.2 Consultant CRUD (Tenant Admin manages Consultants as accounts)

```
[Tenant Admin Back-Office] ──► [Consultants]
    │
    ├── [List] — each row: name, category, case count, utilization,
    │        dispute flags, Accept-Bookings status
    │
    ├── [Invite Consultant] ──► POST /tenant/consultants/invite { email,
    │        category }
    │        Invitee receives invite link ──► [Consultant Onboarding
    │        Wizard] (§3.2, §6.1) — lands directly in profile setup,
    │        no separate approval gate once submitted
    │
    ├── [Deactivate Consultant] ──► Consultant loses dashboard access;
    │        existing Cases and Client data retained (mirrors §14.3
    │        retention rules)
    │
    └── [Open a Consultant] ──► [Single Consultant Admin View]
             ├── License/qualification docs (view only — self-attested,
             │        Tenant Admin can review but there is still no
             │        platform-level verification workflow)
             ├── [Accept Bookings toggle override] — Tenant Admin can
             │        force this off (e.g. compliance hold) in addition
             │        to the Consultant's own self-toggle
             ├── Case count, booking/utilization stats
             └── Dispute flags for this Consultant
```

### 5.3 Tenant Settings & Billing

```
[Tenant Admin Back-Office] ──► [Settings]
    Branding, currency, booking cutoff window, auto-approve-bookings
    toggle, supported languages

[Tenant Admin Back-Office] ──► [Billing]
    Tenant's own subscription plan, invoices, payout account details
```

### 5.4 Dispute Mediation (Tenant Admin, escalation-logged)

```
[Consultant or Client raises a payment/no-show dispute against a Case]
    │
    ▼
[Tenant Admin Back-Office] ──► [Disputes]
    │
    ▼
[Dispute queue] ──► [Open dispute] ──► logged access into the
    relevant Case (AuditLog entry: actor=TENANT_ADMIN, action=
    escalated_case_view, entityId=caseId)
    │
    ▼
[Mediate: partial/full refund override] (manual, not automated —
    applied from the Case/Payouts view, mirrors §13.2)
```

`TENANT_ADMIN` access to private clinical/legal notes is **escalation-logged only** — never default visibility (permission matrix, PRD §1.4).

### 5.5 Tenant-Scoped Audit Log

```
[Tenant Admin Back-Office] ──► [Audit Log]
    Tenant-scoped only — shows the Tenant Admin's own escalated-access
    history within this tenant. Does not show other tenants' data or
    Super Admin's cross-tenant escalations.
```

---

## 6. Consultant Onboarding & Profile Flow

Maps to PRD §5 Phase 3.

### 6.1 Consultant Onboarding Wizard

```
[Invite link opened] (§5.2)
    │
    ▼
[Consultant Onboarding Wizard]
    ├── Category (exactly one, required first):
    │     Medical | Legal | IT | Physiotherapy | Homeopathy | Astrology
    ├── Full name, bio, sub-specialization, years of experience
    ├── Consultation fee, currency, languages spoken, timezone
    └── Optional credential documents (tiered by category, self-attested):
            Medical/Legal    → license number + license PDF + qualification
                                certificate PDF
            Physio/IT        → qualification certificate(s) PDF
            Astrology/Homeo  → identity doc + qualification certificate PDF
             │
             ▼
        [Document Upload Widget] — client-side type/size validation
        (PDF/JPG/PNG, max size per policy)
             │
             ▼
        [Files uploaded to Supabase Storage bucket, path-prefixed
         {tenantId}/{consultantId}/...]
             │  Object path/signed URL reference saved on the
             │  Consultant record; original file name preserved for
             │  display (no OCR/content validation in v1)
             │
             ▼
        [Complete Profile] ──► Consultant record active immediately
             (no platform review/approval gate; Tenant Admin can still
              review docs and can force Accept-Bookings off per §5.2)
             │
             ▼
        [Consultant Workspace] (§7 — morning briefing view)
```

If OTP verification fails or the browser session is lost mid-upload,
partially uploaded documents are retained against the draft Consultant
record so the Consultant is not forced to re-upload on retry.

### 6.2 Editing Profile & Credentials

```
[Consultant Workspace] ──► [Profile]
    ├── Editable public profile: photo, bio, fee, languages
    ├── [Accept Bookings] self-toggle (subject to Tenant Admin override,
    │        §5.2)
    ├── Re-upload/replace credential documents at any time — new files
    │        supersede the prior object reference in the same bucket
    │        (previousVersionId links back, no silent overwrite)
    └── Calendar-sync (.ics feed) opt-in and link
```

---

## 7. Consultant Workspace — Everyday-Life Features

Maps to PRD §2 (Everyday-Life Features for Consultants) and §5 Phases 3–7.

### 7.1 Morning Briefing View (default landing page)

```
[Consultant logs in] ──► [Morning Briefing]
    (Generated fresh each login)
    ├── Today's appointments in order
    ├── One-line AI recap per appointment (if AI Assistant enabled —
    │        see §16)
    ├── Anything overdue (Commitments/Tasks)
    └── Unread client messages
```

### 7.2 Quick-Capture Widget

```
[Any page within Consultant Workspace] ──► [Floating "+ Note" / "🎙 Record"]
    │
    ▼
[Client picker] (searchable, no need to navigate into a Case first)
    │
    ▼
[Quick note / recording captured] ──► attached as an ad-hoc Interaction
    against the selected Client's active Case (§9)
```

### 7.3 Client Search, Pinning & CRM Tags

```
[Consultant Workspace] ──► [My Clients]
    │
    ├── [Search] — by name/phone/tag, across all of this Consultant's
    │        clients (own clients only, tenant-scoped)
    ├── [Pin] — pin frequently-seen clients to top of list
    ├── [Tags] — create/assign/filter by CRM tag (e.g. "chronic," "VIP,"
    │        "needs Hindi"); per-consultant, not shared tenant-wide
    ├── [Bulk-message a tag group] (via configured notification channels)
    └── Columns: last seen / next appointment
```

### 7.4 Commitment/Task Templates

```
[Consultant Workspace] ──► [Session Flow] or [Dashboard → New Commitment/Task]
    │
    ▼
[Template library picker] — saveable library of common commitments/
    tasks per category (e.g. Physio's "do these 3 stretches daily")
    │
    ├─[Use existing template]──► pre-fills Commitment/Task fields
    │
    └─[Save current as new template]──► added to this Consultant's
             template library for reuse across clients
```

### 7.5 Calendar Sync (Outbound)

```
[Consultant Workspace] ──► [Profile] ──► [Calendar Sync]
    │
    ▼
[Generate one-way .ics feed URL] ──► Consultant subscribes from Google
    Calendar / Outlook / Apple Calendar
    (One-way push only — external calendar edits do not write back)
```

### 7.6 Click-to-Call / Click-to-WhatsApp

```
[Case page] ──► [Call] or [WhatsApp] (via Twilio)
    │
    ▼
Call/message placed
    │
    ▼
["Log what was discussed?" prompt] ──► optional ad-hoc Interaction
    logged against the Case
```

### 7.7 Waitlist for Cancelled Slots

```
[Client cancels an APPROVED appointment] (§8.4)
    │
    ▼
[Consultant notified] ──► [Notify Waitlist] (optional action)
    │
    ▼
Waitlisted clients for that slot/time band notified the slot reopened
```

### 7.8 End-of-Day Digest

```
[Scheduled job, end of Consultant's business day]
    │
    ▼
Automated evening email/notification:
    - Sessions completed today
    - Commitments/Tasks created today
    - Anything still open
```

### 7.9 Personal Scratchpad

```
[Consultant Workspace] ──► [Scratchpad]
    Private, never shared with any Client or Tenant Admin, never
    RAG-indexed — separate storage from Case notes
```

### 7.10 Keyboard-First Session Logging

```
[Session Screen] ──► keyboard shortcuts:
    - Start/stop recording
    - Save note
    - Log a commitment/task
    (No mouse required between back-to-back sessions)
```

### 7.11 Offline-Safe Note Drafts

```
[Note being typed] ──► [Network drops]
    │
    ▼
Draft held in local browser storage
    │
    ▼
[Connectivity returns] ──► Draft synced to server, never silently lost
```

### 7.12 Referral / Source Tracking

```
[New Client's first Case created] ──► [Consultant tags referral source]
    (For the Consultant's own business insight only — not shared with
     the Client, not the same as the formal Referral program in §15)
```

### 7.13 Out-of-Office Auto-Responder

```
[Consultant Workspace] ──► [Out-of-Office]
    │
    ▼
[Set period: start date, end date, auto-reply message,
 pausesNewBookings toggle]
    │
    ▼
[Active OutOfOfficePeriod created]
    │
    ├─[pausesNewBookings = true]──► New booking requests during this
    │        window blocked at the Slot Picker with the auto-reply
    │        message shown; client messages during this period also
    │        auto-replied
    │
    └── No need to manually block every individual slot — this
             directly prevents the "vacation booked over" edge case
             rather than reacting to it after the fact
```

### 7.14 Overbooking / Burnout Indicator

```
[Consultant Workspace Dashboard] ──► [Soft warning banner]
    Shown if booked hours or overdue-commitment count is trending
    unsustainably high, read from the ConsultantAnalyticsSnapshot
    cache (scheduled aggregation job — not computed live on every
    dashboard load)
```

### 7.15 Smart Slot Suggestions

```
[Availability Tab] ──► [Smart suggestions panel]
    Highlights time slots with historically high cancellation/no-show
    rates (from ConsultantAnalyticsSnapshot), so the Consultant can
    adjust availability proactively
```

---

## 8. Booking Flow (Client-initiated, tenant-scoped)

Maps to PRD §5 Phase 4. The Client Dashboard now links to **this tenant's list of Consultants** (not a single Consultant, and not a cross-tenant marketplace/search).

### 8.1 Consultant Listing & Entry Point

```
[Client Dashboard] ──► [Book a Session]
    │
    ▼
[This Tenant's Consultant List] — filterable by category
    │
    ▼
[Consultant Profile Page]
    ├── Bio, qualifications, credential docs (viewable), rating,
    │        NPS-informed reputation, fee, languages
    └── [Book Appointment]
```

### 8.2 Booking Request (single or recurring series)

```
[Book Appointment]
    │
    ▼
[Dependent/Family Profile Selector] (optional — book on behalf of a
    linked minor/dependent; ties into guardian-consent handling, §14)
    │
    ▼
[Language toggle] (matches Consultant's languagesSpoken)
    │
    ▼
[Slot Picker] — shows Consultant's published OPEN slots
    │  Times displayed in client's local timezone; stored/transmitted
    │  in UTC
    │
    ├──[Single session]
    │        │
    │        ▼
    │   [Confirm slot + optional message]
    │
    └──[Recurring series]
             │
             ▼
        [Recurrence picker: day of week/time + start date + end date
         or occurrence count] ──► creates an AppointmentSeries record
         plus its individual Appointment occurrences in one flow
             │
             ▼
        [Confirm series + optional message]
    │
    ▼
[Slot lock attempt] — DB-level unique/locking constraint on
    (slotId, status), per occurrence if a series
    │
    ├─[Lock fails — slot already taken]──► Toast: "Slot no longer
    │        available." Return to Slot Picker.
    │        If part of a series, offer to reschedule just that
    │        occurrence rather than the whole series.
    │
    ├─[Slot full but waitlist enabled]──► [Join Waitlist] option shown
    │
    └─[Lock succeeds]──► [Appointment(s) created: status = REQUESTED]
                          (or status = APPROVED directly if consultant/
                           tenant has auto-approve enabled)
                          │
                          ▼
                     [Payment step] (§13) — configurable per Consultant:
                          pay for the entire series upfront, or per
                          occurrence
                          │
                          ▼
                     Consultant notified (APPOINTMENT_REQUEST)
                     Client sees appointment(s) as "Awaiting consultant
                     response"; [Add to calendar] (.ics/Google/Outlook/
                     Apple) shown on confirmation
```

### 8.3 Consultant Response to Booking Request

```
[Consultant Workspace] ──► [Appointment Requests]
    │
    [Request card: Client name, requested slot(s), message; series
     requests show as one grouped card, approvable/manageable as a
     single action rather than occurrence-by-occurrence]
    │
    ├──[Approve]──► status = APPROVED (all occurrences if series-level
    │               approval, or per-occurrence if the Consultant drills in)
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
    │        ├─[Decline]──► status = REJECTED (client must rebook)
    │        └─[No response within configurable window]──►
    │                 auto-expire → status = CANCELLED
    │                 Both parties notified
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
Client notified to rebook
```

### 8.4 Cancellation (single occurrence or full series)

```
[Appointment: APPROVED]
    │
    ├──[Client cancels]──┐
    │                    ├─► Allowed up to configurable cutoff (e.g., 2h before)
    └──[Consultant cancels]┘   Mandatory reason
                             │
                             ▼
                        status = CANCELLED
                        Refund flow triggered if paid (§13.2)
                        Other party notified

[Client viewing a recurring series]
    │
    ▼
[Series view] ──► [Cancel this occurrence] or [Cancel entire series]
```

### 8.5 Availability Editing After Booking

```
[Consultant edits/removes Availability]
    │
    ├─[No existing bookings in that window]──► Slot updated directly
    │
    └─[Existing APPROVED appointment(s) in that window]──►
             Existing appointment(s) NOT silently cancelled
             │
             ▼
        [Forced Reschedule/Cancel workflow] (§8.3 reschedule path)
        triggered per affected appointment; client notified of each
```

Out-of-office periods (§7.13) follow the same forced-reschedule path when set retroactively over existing bookings.

### 8.6 No-Show Handling

```
[Appointment scheduledStart time passes]
    │
    ├─[Neither party "Started Session"]──► after grace period,
    │                                       status = NO_SHOW
    │                                       Either party can flag/dispute
    │                                       (escalates to Tenant Admin, §5.4)
    │
    └─[Session started by consultant]──► proceeds to §9 Session Flow
```

### 8.7 Join Reminder

```
[~10 minutes before an approved appointment's start time]
    │
    ▼
[Push notification: SESSION_JOINING_SOON] — sent to both Client and
    Consultant, surfacing the external video link front and center
    (not buried in an earlier confirmation email)
```

---

## 9. Session Flow

Maps to PRD v0.2's carried-over Session Flow (Phase 5). Unchanged in mechanics from v0.2.0, now always tenant-scoped.

```
[Approved Appointment, time reached] ──► [Start Session]
    │  (or: [+ Log Ad-hoc Interaction] from a Case, or via the
    │   Quick-Capture widget, §7.2)
    │
    ▼
[Session Screen]
    │
    ├── [Consent checkbox] — required before recording starts where
    │        legally required; recording disabled if declined
    │
    ├── [Record Audio]
    │        │
    │        ▼
    │   [Recording in progress] (in-browser)
    │        │
    │        ├─[Stop]──► Audio uploaded to Supabase storage bucket
    │        │           ({tenantId}/{caseId}/... path prefix)
    │        │           transcriptStatus = PENDING
    │        │           │
    │        │           ▼
    │        │      [Async Whisper transcription job queued]
    │        │           │
    │        │           ├─[> 1hr audio]──► chunked upload/transcription,
    │        │           │                   progress indicator
    │        │           │
    │        │           ├─[Success]──► transcriptStatus = COMPLETED
    │        │           │              Transcript attached to Interaction
    │        │           │              (single-speaker only per v1 scope)
    │        │           │
    │        │           └─[Failure / low confidence]──►
    │        │                    transcriptStatus = FAILED
    │        │                    Consultant notified, can manually
    │        │                    edit/retype; original audio retained
    │        │                    as source of truth
    │        │
    │        └─[Browser crash / network drop mid-recording]──►
    │                 Partial audio salvaged/uploaded where possible
    │                 Consultant notified of partial capture,
    │                 not silently dropped
    │
    ├── [Notes] — free-text/rich-text; offline-safe drafts (§7.11)
    │
    ├── [Upload Documents]
    │        │
    │        ▼
    │   [File picker] ──► type allow-list + size limit enforced ──►
    │        malware scan queued (scanStatus: PENDING → CLEAN/INFECTED)
    │        File not accessible until scan clears
    │        │
    │        ├─[Re-upload of existing doc]──► stored as new version,
    │        │        previousVersionId links to prior — no overwrite
    │        │
    │        └─[Visibility toggle: Consultant-only / Shared with client]
    │                 Explicit confirm step required before sharing
    │
    ├── [Log Commitment] — "I will send X by [date]", madeBy =
    │        CONSULTANT/CLIENT; optionally pre-filled from a template
    │        (§7.4)
    │
    ├── [Assign Task] — to client or self, with due date; optionally
    │        pre-filled from a template
    │
    └── [End Session] ──► Interaction saved to Case
                          Appointment status → COMPLETED (if tied to one)
                          All items appear on Case Timeline
```

Soft-delete applies to notes/recordings (recovery window before hard delete). Sensitive transcript content inherits the same confidentiality controls as written notes.

---

## 10. Case Timeline

### 10.1 Case Timeline (Consultant View)

```
[Case Timeline]
    │
    ├── [Filter bar] Event type (Appointment/Interaction/Commitment/
    │        Task/Document) | Date range | Keyword search
    │        (matches notes/transcript text)
    │
    ├── [Quick-capture button] (§7.2, in-context)
    ├── [Click-to-call / click-to-WhatsApp] (§7.6)
    ├── [Refer to colleague] — same-tenant only, opens cross-consultant
    │        referral flow with a context note carried over (§15.2)
    │
    └── [Chronological feed]
          Appointments, Interactions, Commitments, Tasks, Documents
          rendered as timeline cards, newest first
          Paginated/lazy-loaded for long histories
```

### 10.2 Case Timeline (Client View — restricted)

```
[Case Timeline — Client]
    │
    ├── Appointments (own)
    ├── Documents explicitly marked SHARED_WITH_CLIENT
    ├── Tasks assigned to the client (own tasks only)
    ├── AI Summaries explicitly shared by consultant, view-only
    │        (client cannot query the AI directly against private notes)
    ├── [Export timeline] — downloadable PDF summary (data portability)
    └── [Leave a review] (post-COMPLETED, §10.4)
```

Consultant-authored private notes and raw transcripts are never
visible to the client, regardless of Case state. `TENANT_ADMIN` access
to this data is escalation-logged only (§5.4).

### 10.3 Weekly Calendar View (Consultant & Client, shared component)

```
[Calendar Tab]
    │
    ├── [Week view] (default) — Mon–Sun grid, current week highlighted,
    │        [< Prev] [Today] [Next >] navigation, [Week / Day] toggle
    │
    ├── Event chips color-coded by status; series occurrences visually
    │        grouped
    │
    └── [Click a day] ──► [Day Overview Panel]
             ├── Header: full date
             ├── Chronological list of appointments that day
             ├── Empty state: "No appointments on this day."
             └── [Close]
```

Consultant side additionally aggregates across the Consultant's own
clients only (never other Consultants' clients in the same tenant,
unless that Consultant is also the Tenant Admin viewing tenant-wide
analytics, §5.3).

### 10.4 Reviews (with NPS)

```
[Appointment status → COMPLETED]
    │
    ▼
[Review prompt] (client dashboard, next visit)
    ├── Star rating (1–5)
    ├── NPS-style prompt: "How likely are you to recommend this
    │        Consultant?" (0–10)
    ├── Optional comment
    └── [Submit] ──► Review stored, subject to moderation flag (isVisible)
                     Consultant's ratingAvg/ratingCount and NPS signal
                     updated, feeds Consultant Analytics (§17)
```

---

## 11. Client Grievance & Reporting Flow

Maps to PRD §4 (new). This is the one place in the system where the
normal "the Tenant Admin can see their own tenant's activity" rule is
intentionally broken.

### 11.1 Submission

```
[Client, anywhere they are logged in on any tenant] ──►
    ["Report a concern"] — persistent link in the client-facing
    layout footer/nav; present uniformly across every tenant
    subdomain; a Tenant Admin cannot disable or hide this link
    │
    ▼
[Grievance Form]
    ├── Subject: Consultant / Tenant Admin / Billing / Platform / Other
    ├── Optional link to the relevant Case
    ├── Category: SERVICE_QUALITY / MISCONDUCT / BILLING_DISPUTE /
    │        DATA_PRIVACY / OTHER
    ├── Free-text description
    └── Optional attachments (e.g. a screenshot)
    │
    ▼
[Submit] ──► Grievance row created, tenantId stored for context only
    (does NOT grant that tenant's own Tenant Admin visibility)
    │
    ▼
[Routes directly to SUPER_ADMIN] (in-app + email; + SMS if severity
    later set to CRITICAL) — see §4.3 for the Super Admin side
```

### 11.2 Client-Side Tracking

```
[Client] ──► [Report a Concern] ──► [My Submissions]
    │
    ▼
List of the Client's own past grievances with current status
    (OPEN / UNDER_REVIEW / RESOLVED / DISMISSED)
    │
    ▼
Client never sees other clients' grievances. The Tenant Admin and
Consultant of that tenant never see this queue at all, in any form.
```

### 11.3 Edge Case — Grievance About the Platform Itself

```
[Grievance concerns Super Admin / the platform itself]
    │
    ▼
Routing to SUPER_ADMIN's own inbox would defeat the purpose
    │
    ▼
Out-of-band channel required: a fixed external support email,
    surfaced in the grievance form's help text (open point — final
    channel to be confirmed, PRD §6 Open Point #4)
```

---

## 12. Account, Data Management & Audit

Maps to PRD §1.2, §5 Phase 1/2/10.

### 12.1 Audit Logging (all tiers)

```
[Any privileged/escalated read of tenant or case data]
    │
    ▼
AuditLog entry written: actorUserId, action, entityId, timestamp,
    metadata, reason (mandatory for Super Admin escalations beyond
    the tenant list/billing dashboard, and for Tenant Admin dispute
    escalations)
    │
    ▼
Visible in:
    - Super Admin's Global Audit Log (all tenants) — §4.2
    - Tenant Admin's Tenant-Scoped Audit Log (own tenant only) — §5.5
```

Access control is purely authorship + explicit-share + logged-escalation
based — never unrestricted default visibility, even for `SUPER_ADMIN`
(unrestricted ≠ invisible).

### 12.2 Sensitive-Content Access

```
[Case contains sensitive content] (clinical/legal notes, transcripts)
    │
    ▼
Visible only to the Consultant who authored it and, where explicitly
shared, the Client it belongs to (§10.2)
    │
    ▼
TENANT_ADMIN access requires a logged escalation (dispute mediation,
§5.4) — never default visibility
    │
    ▼
SUPER_ADMIN access requires a logged "View Tenant Data" escalation
with mandatory reason (§4.1) — never silent
```

### 12.3 Consultant Deactivation / Data Retention

```
[Tenant Admin deactivates a Consultant] (§5.2)
    │
    ▼
Client retains access to own historical Case data (timeline,
    documents) even though the Consultant account is deactivated

[Client requests full data deletion]
    │
    ├─[No conflicting retention obligation]──► Full deletion processed
    │
    └─[Consultant category has legal/medical retention obligation]──►
             Client-identifying fields anonymized; clinical/legal
             record retained per policy — not a full delete
```

Minor clients require guardian/parent account linkage and consent
handling at profile creation (dependent/family profiles, §8.2, §14),
not just a flagged DOB field.

### 12.4 Tenant Suspension / Deletion

```
[Super Admin suspends a tenant] (§4.1)
    │
    ▼
middleware.ts blocks all further requests to that subdomain,
    shows branded "this practice is unavailable" page
    │
    ▼
No data is deleted on suspension — only on explicit [Delete Tenant]
    action, which follows the same retention-obligation branching as
    §12.3, applied tenant-wide
```

---

## 13. Payment Flow (Razorpay)

India-only; no multi-currency in v1. Per-tenant payout accounts.

### 13.1 Payment Capture

```
[Booking confirmed / session starting] (per Consultant's pay-on-booking
 vs pay-after-session setting; per-occurrence or upfront-for-series
 per §8.2)
    │
    ▼
[Razorpay order created] ──► [Checkout widget] — saved payment method
    (tokenized) offered if the Client has one on file
    │
    ├─[Payment succeeds]──► Webhook received ──► paymentStatus = PAID
    │        Appointment marked APPROVED-and-paid (if pay-on-booking)
    │        Invoice/receipt auto-generated (downloadable PDF, §10.2)
    │
    ├─[Payment fails]──► paymentStatus = UNPAID
    │        Client prompted to retry
    │
    └─[Payment succeeds but webhook fails to reach platform]──►
             Reconciliation job periodically checks Razorpay status
             against internal records; corrects stuck UNPAID state
```

### 13.2 Refunds & Disputes

```
[Cancellation before cutoff]──► Full refund, automated
[Cancellation after session start]──► No refund by default policy
    │
    └─[Client disputes]──► Raised against the Case; resolved by the
             Consultant or Tenant Admin (§5.4)
             │
             ▼
        [Consultant/Tenant-Admin-mediated partial/full refund override]
        (manual, not automated — applied from Case/Payouts or Disputes view)
```

### 13.3 Consultant Payouts

```
[Consultant Workspace] ──► [Payouts]
    Ledger: gross fee − platform commission, per Appointment
    │
    ├─[Payout account details valid]──► Disbursement (manual/batched in v1)
    │
    └─[Payout account missing/invalid]──►
             Payout blocked, consultant notified,
             transaction record retained, not lost
```

---

## 14. Client Onboarding & Dependent Profiles

### 14.1 Client Profile Setup

```
[Client Profile Setup]
    ├── All mandatory/optional fields filled by the user
    ├── Guardian mapping/linkage (required if DOB indicates minor,
    │        maps to guardian_links table)
    ▼
[Client Dashboard] (base profile complete, tenant-scoped)
```

Category-specific profile sections (e.g., medical history) are **not**
collected at signup — they appear as optional/conditional prompts the
first time a client books that category's session, stored against the
resulting Case rather than the base ClientProfile.

### 14.2 Dependent / Family Profiles

```
[Client Dashboard] ──► [Profile] ──► [Add Dependent]
    │
    ▼
[Dependent Profile Form] — name, DOB, relationship
    │
    ├─[DOB indicates minor]──► guardian-consent handling required,
    │        linked to the primary Client's account
    │
    ▼
[Dependent Profile saved] ──► selectable at booking time (§8.2) so
    the Client can book and manage Cases on the dependent's behalf
```

### 14.3 Mobile Document Upload

```
[Any document upload point in the app] (registration, session
 documents, grievance attachments)
    │
    ▼
[Mobile camera capture option] — snap a photo of a prescription/report
    directly instead of requiring a desktop scan
```

---

## 15. Referral Flows

Two distinct referral mechanisms exist — do not conflate them.

### 15.1 Client-Invite-a-Client (Growth Program)

```
[Client Dashboard] ──► [Refer a Friend]
    │
    ▼
[Get/share referral code] (link, code, or both)
    │
    ▼
[Invitee signs up using the referral code] ──► Referral row updated:
    referredClientId populated
    │
    ▼
[Reward applied] per rewardType (DISCOUNT_CODE / CREDIT / NONE),
    rewardStatus: PENDING → GRANTED (typically on the referred
    Client's first completed/paid booking)
    │
    ▼
[Referring Client sees status: Pending / Granted] on their Refer page
```

Consultant side (business-insight configuration, distinct from the
Client-facing program):

```
[Consultant Workspace] ──► [Referral Program]
    Generate/share a referral code, see referral status, configure
    the reward (discount code / credit)
```

### 15.2 Cross-Consultant Referral (Same Tenant Only)

```
[Case Timeline (Consultant View)] ──► [Refer to Colleague] (§10.1)
    │
    ▼
[Select destination Consultant] (same tenant only — no cross-tenant
    referral in this version)
    │
    ▼
[Context note] — a carried-over summary, NOT raw private notes,
    unless the referring Consultant explicitly shares them
    │
    ▼
[ConsultantReferral created] status = PENDING
    │
    ▼
[Destination Consultant] ──► [Referrals] ──► [Incoming queue]
    │
    ├─[Accept]──► New Case auto-created under the destination
    │        Consultant, seeded with the referring Consultant's
    │        context note — the client does not have to
    │        re-explain everything from scratch
    │
    └─[Decline]──► status = DECLINED, referring Consultant notified
```

---

## 16. AI Assistant (RAG) — Consultant & Client

> **Status:** Phase 9 in the build plan — not part of the earliest
> releases; sequenced after the core booking/session/commitment loop,
> retention, and money layers are live.

```
[Case Timeline] ──► [Ask AI]
    │
    ▼
[AI Chat Panel] (scoped to this Case only)
    │
    ├──[Free-form question]
    │        │
    │        ▼
    │   Retrieval hard-filtered by BOTH tenantId AND caseId at the
    │   query layer (Pinecone: one namespace per tenant, or at
    │   minimum mandatory metadata filter on tenantId + caseId,
    │   enforced at the retrieval-service layer — never left to
    │   prompt instructions alone)
    │        │
    │        ▼
    │   [Answer with inline citations] → each claim links to source
    │   Interaction/Document
    │        │
    │        ├─[Question asks for new medical/legal/diagnostic advice]──►
    │        │        AI declines, redirects: "This is a summary of your
    │        │        own recorded judgment — please make the clinical/
    │        │        legal call yourself." (disclosure shown persistently
    │        │        in panel)
    │        │
    │        └─[thumbs up/down on response]──►
    │                 down-vote logs to review queue;
    │                 flagged responses excluded from being reused as
    │                 ground truth elsewhere
    │
    └──[Generate Session Recap] (one-click, pre-appointment)
             │
             ▼
        Structured summary: what happened, commitments (by whom),
        open tasks, key documents
             │
             ▼
        Long case histories: hierarchical summarization
        (per-session summaries → summary-of-summaries)
```

If a source Interaction is later deleted, existing AI summaries
generated from it are retained as historical snapshots with the
source marked deleted/unavailable, rather than retroactively
invalidated.

Client side: view-only access to Consultant-shared summaries only —
never a query interface into private notes (§10.2).

---

## 17. Analytics & Growth (Consultant-Facing)

Maps to PRD §5 Phase 7. Computed by a scheduled aggregation job
writing to a `ConsultantAnalyticsSnapshot` cache table — not queried
live against raw history on every dashboard load.

```
[Consultant Workspace] ──► [Analytics]
    ├── Repeat-booking rate
    ├── Average fee realized
    ├── Busiest-hours heatmap
    └── (Separate from the Payouts ledger — business insight, not
             accounting)

[Consultant Workspace Dashboard] (extended)
    ├── Overbooking/burnout indicator (§7.14)
    └── Smart slot suggestions surfaced on the Availability tab (§7.15)
```

---

## 18. Notification Flow

```
[Server event occurs]
   (APPOINTMENT_REQUEST | APPOINTMENT_APPROVED | RESCHEDULE |
    COMMITMENT_DUE | TASK_DUE | TASK_OVERDUE | PAYMENT_RECEIVED |
    DOCUMENT_UPLOADED | AI_SUMMARY_READY | GRIEVANCE_SUBMITTED |
    GRIEVANCE_STATUS_CHANGED | SESSION_JOINING_SOON)
    │
    ├──► [In-app notification] — stored, real-time badge update
    │
    ├──► [Email] — via configured provider (Resend), tenant-branded
    │         templates
    │
    ├──► [SMS / WhatsApp] — via Twilio, primarily for clients unlikely
    │         to check the platform (older demographics in Astrology/
    │         Homeopathy)
    │
    └──► [Push] — web push, deep-links to relevant page

[Notification Center]
    ├── Header: "Notifications" | [Mark all as read]
    ├── Grouped: Today | Yesterday | This Week | Older
    └── [Load more] (pagination, 20 per page)

[Notification Preferences]
    Per-user, per-channel opt-in/opt-out
```

Notes on new notification types:
- `GRIEVANCE_SUBMITTED` — routes to Super Admin only (+ SMS if
  severity = CRITICAL); never routed to the tenant being complained
  about.
- `GRIEVANCE_STATUS_CHANGED` — routes to the submitting Client only.
- `SESSION_JOINING_SOON` — routes to both Client and Consultant,
  ~10 minutes before an appointment (§8.7).

Commitment/Task due-soon lead time is configurable (default 24h).

---

## 19. Error & Fallback States

### 19.1 API Error Handling (Client-facing)

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
| Tenant SUSPENDED / unknown subdomain | "This practice is unavailable." | Branded static page, no app shell loaded |
| Wrong-tenant token at login | "This account belongs to a different practice." | Redirect suggestion to correct subdomain |
| Network offline | "You're offline. Check your connection." | Offline banner |

### 19.2 Empty States

| Screen | Empty state message | CTA |
|--------|---------------------|-----|
| My Cases (Client) | "No cases yet. Book your first consultation." | [Book a Session] |
| My Clients (Consultant) | "No active clients yet." | — |
| Appointment Requests | "No pending requests." | — |
| Availability | "No slots published yet." | [Set Up Availability] |
| Case Timeline | "Nothing logged yet for this case." | — |
| Deadlines / Dashboard Widget | "No upcoming or overdue items." | — |
| AI Chat | "Ask me to recap this case or summarize what's happened so far." | — |
| Notifications | "You're all caught up!" | — |
| Tenants (Super Admin) | "No tenants yet." | [Create Tenant] |
| Consultants (Tenant Admin) | "No consultants yet." | [Invite Consultant] |
| Grievances (Super Admin) | "No open grievances." | — |
| Referrals (Consultant) | "No pending referrals." | — |

### 19.3 Loading / Async States

- Skeleton screens for all list/card/timeline components (not spinners).
- Transcription and AI summarization are background jobs — visible
  status (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`), never a
  blocking UI wait.
- Full-page loader only on initial auth check and initial tenant
  resolution.

---

## 20. Screen / Route Inventory

Route convention: `app/(platform)/...` = Super Admin control plane
(`admin.ayushman.app`); `app/(tenant)/[slug]/(admin)/...`,
`(consultant)/...` = tenant back-office; `app/(tenant)/[slug]/(public)/...`,
`(client)/...` = tenant-facing site; `app/(auth)/...` = shared,
tenant-aware auth pages.

| Screen | Route | Auth Required | Role |
|--------|-------|---------------|------|
| Platform Dashboard | `admin.ayushman.app/dashboard` | Yes | Super Admin |
| Tenants List | `admin.ayushman.app/tenants` | Yes | Super Admin |
| Single Tenant Deep View | `admin.ayushman.app/tenants/:tenantId` | Yes | Super Admin |
| Platform Billing | `admin.ayushman.app/billing` | Yes | Super Admin |
| Global Audit Log | `admin.ayushman.app/audit-log` | Yes | Super Admin |
| Global Grievance Inbox | `admin.ayushman.app/grievances` | Yes | Super Admin |
| Grievance Detail | `admin.ayushman.app/grievances/:grievanceId` | Yes | Super Admin |
| Platform Settings | `admin.ayushman.app/settings` | Yes | Super Admin |
| Login (tenant-aware) | `{slug}.ayushman.app/login` or `admin.ayushman.app/login` | No | — |
| Reset Password | `(auth)/reset-password` | No | — |
| Register (tenant-scoped) | `{slug}.ayushman.app/register` | No | — |
| Tenant Landing | `{slug}.ayushman.app/` | No | — |
| Consultant Listing / Book | `{slug}.ayushman.app/book` | No | — |
| Booking Flow | `{slug}.ayushman.app/book/appointment` | Yes | Client |
| Client Dashboard | `{slug}.ayushman.app/dashboard` | Yes | Client |
| Client Appointments | `{slug}.ayushman.app/(client)/appointments` | Yes | Client |
| Client Calendar | `{slug}.ayushman.app/(client)/calendar` | Yes | Client |
| Client Cases / Timeline | `{slug}.ayushman.app/(client)/cases/:caseId` | Yes | Client |
| Client AI Summary View | `{slug}.ayushman.app/(client)/cases/:caseId/ai-summary` | Yes | Client |
| Client Tasks | `{slug}.ayushman.app/(client)/tasks` | Yes | Client |
| Client Payments | `{slug}.ayushman.app/(client)/payments` | Yes | Client |
| Payment Checkout | `{slug}.ayushman.app/appointments/:id/pay` | Yes | Client |
| Client Review | `{slug}.ayushman.app/(client)/appointments/:id/review` | Yes | Client |
| Client Refer-a-Friend | `{slug}.ayushman.app/(client)/refer` | Yes | Client |
| Client Grievance Form | `{slug}.ayushman.app/(client)/report` | Yes | Client |
| Consultant Onboarding | `{slug}.ayushman.app/(consultant)/onboarding` | Yes | Consultant |
| Consultant Dashboard (Morning Briefing) | `{slug}.ayushman.app/(consultant)/dashboard` | Yes | Consultant |
| Consultant Appointment Requests | `{slug}.ayushman.app/(consultant)/appointments` | Yes | Consultant |
| Consultant Calendar | `{slug}.ayushman.app/(consultant)/calendar` | Yes | Consultant |
| Consultant Availability | `{slug}.ayushman.app/(consultant)/availability` | Yes | Consultant |
| Consultant Out-of-Office | `{slug}.ayushman.app/(consultant)/out-of-office` | Yes | Consultant |
| Consultant Profile | `{slug}.ayushman.app/(consultant)/profile` | Yes | Consultant |
| My Clients (Consultant) | `{slug}.ayushman.app/(consultant)/clients` | Yes | Consultant |
| Case Timeline (Consultant view) | `{slug}.ayushman.app/(consultant)/clients/:caseId` | Yes | Consultant |
| Session / Interaction Logging | `{slug}.ayushman.app/(consultant)/sessions/:appointmentId?` | Yes | Consultant |
| Consultant Referrals | `{slug}.ayushman.app/(consultant)/referrals` | Yes | Consultant |
| Consultant Referral Program (config) | `{slug}.ayushman.app/(consultant)/referral-program` | Yes | Consultant |
| AI Assistant Panel | `{slug}.ayushman.app/(consultant)/clients/:caseId/ai` | Yes | Consultant, Client (shared summaries only) |
| Consultant Analytics | `{slug}.ayushman.app/(consultant)/analytics` | Yes | Consultant |
| Consultant Payouts | `{slug}.ayushman.app/(consultant)/payouts` | Yes | Consultant |
| Notifications | `{slug}.ayushman.app/(*)/notifications` | Yes | Any tenant-scoped role |
| Personal Profile / Settings | `{slug}.ayushman.app/(*)/profile/settings` | Yes | Any tenant-scoped role |
| Tenant Admin Onboarding Wizard | `{slug}.ayushman.app/(admin)/onboarding` | Yes | Tenant Admin |
| Tenant Admin Dashboard | `{slug}.ayushman.app/(admin)/dashboard` | Yes | Tenant Admin |
| Consultants CRUD List | `{slug}.ayushman.app/(admin)/consultants` | Yes | Tenant Admin |
| Single Consultant Admin View | `{slug}.ayushman.app/(admin)/consultants/:consultantId` | Yes | Tenant Admin |
| Tenant Settings | `{slug}.ayushman.app/(admin)/settings` | Yes | Tenant Admin |
| Tenant Billing | `{slug}.ayushman.app/(admin)/billing` | Yes | Tenant Admin |
| Tenant Disputes | `{slug}.ayushman.app/(admin)/disputes` | Yes | Tenant Admin |
| Tenant Audit Log | `{slug}.ayushman.app/(admin)/audit-log` | Yes | Tenant Admin |
| Help / FAQ (rule-based) | `{slug}.ayushman.app/(public)/help` | No | — |
| 404 | `*` | No | — |
| 500 | — | No | — |

---

## 21. Explicitly Out of Scope for This Flow Document (Current Version)

Carried over / reconfirmed from the PRD:
- Fully self-serve tenant provisioning (a practice signing itself up
  without a Super Admin creating the tenant) — Super-Admin-initiated
  only in this version.
- Cross-tenant Client identity (one login spanning multiple tenants) —
  a Client is scoped to a single tenant; using two practices requires
  two separate logins.
- Native mobile app flows (responsive web only; mobile camera capture
  for document upload is supported within the responsive web app).
- Insurance billing / claims flows.
- E-prescription / e-signature flows.
- In-platform video calling (external meeting links only, joined via
  a stored link on the Appointment).
- Non-INR / non-Razorpay payment rails.
- Group/family session flows (distinct from dependent/family
  *profiles*, which are in scope, §14.2).
- Anonymized aggregate grievance-count visibility for Tenant Admins —
  flagged as an open point (PRD §6 Open Point #5), not built by
  default in this version.
- A dedicated out-of-band channel for grievances about the platform
  itself — open point (PRD §6 Open Point #4), pending a decision on
  the exact external contact method.
