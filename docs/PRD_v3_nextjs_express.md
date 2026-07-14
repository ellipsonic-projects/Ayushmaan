# Product Requirements Document

## Consultant Context & Client Relationship Platform ("Ayushman") — Multi-Tenant Edition

**Version:** 0.3 (Draft — supersedes v0.2; migrates tech stack to a Next.js + Express monorepo)
**Owner:** Product
**Status:** Draft for review
**Last updated:** July 5, 2026

## 1. Role & Tenancy Model (read this first — it governs everything else)

### 1.1 The three tiers, four roles

| Tier         | Role (enum)    | Who they are                                                                                                   | Scope                                                                                                                                                                                                                          |
| ------------ | -------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Platform** | `SUPER_ADMIN`  | Ayushman's own ops team (`admin@ayushman.app`)                                                                 | **Global.** Creates/suspends/deletes tenants. Full, unrestricted access to all data in all tenants, all privileges, no exceptions.                                                                                             |
| **Tenant**   | `TENANT_ADMIN` | Default admin created _for_ each tenant at provisioning time (`admin@{tenant-slug}.ayushman.app`)              | **Single tenant.** Performs CRUD on Consultants within their tenant, owns tenant-wide settings (branding, payment/payout config, availability policy, staff), can view cross-consultant tenant analytics and mediate disputes. |
| **Tenant**   | `CONSULTANT`   | Medical/Legal/IT/Physio/Homeopathy/Astrology professional, created **by** the Tenant Admin inside their tenant | **Own client list only**, within that tenant. Does the actual session logging, timeline, commitments/tasks, AI chat — this is where v0.1's original "Consultant" persona now lives.                                            |
| **Tenant**   | `CLIENT`       | End customer of a specific tenant                                                                              | **Own cases only**, within that one tenant. Accesses the tenant's public site/subdomain to book, pay, and track their relationship with a Consultant.                                                                          |

**Assumption flagged for review:** I've kept `CONSULTANT` as a distinct role from `TENANT_ADMIN` (rather than merging them) because your CRUD requirement implies the Tenant Admin _manages_ Consultants as accounts — meaning at least one of them isn't a Consultant themself. In solo-practice tenants, the same person can simply hold both roles (the Tenant Admin also has a Consultant profile and takes their own clients) — nothing forces them to be different people. Flag if you intended `TENANT_ADMIN` and `CONSULTANT` to always be the same account.

### 1.2 Data isolation strategy (non-negotiable, applies to every table)

- Every tenant-scoped table carries a **`tenantId`** column (denormalized onto `Case`, `Appointment`, `Interaction`, `Commitment`, `Task`, `Document`, `Payment`, `Notification`, `AuditLog`, etc. — not just on `User`), so row-level policies never need a join to enforce isolation.
- **Postgres Row-Level Security (RLS)** on every tenant-scoped table: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. The app sets this session variable from the authenticated JWT on every request — it is never taken from a client-supplied header or query param.
- **Supabase Auth JWT custom claim** `tenant_id` is stamped onto the token at sign-in via a Postgres [Auth Hook](https://supabase.com/docs/guides/auth/auth-hooks) (`custom_access_token_hook`); `SUPER_ADMIN` tokens carry `tenant_id: null` and a separate `is_super_admin: true` claim that RLS policies explicitly check to bypass the tenant filter. Because the claim is stamped server-side inside Postgres — not set by either app — neither the Next.js frontend nor the Express API can forge or override it.
- **Tenant resolution — two layers now that frontend and backend are separate apps:**
  - **Next.js (frontend):** subdomain-based (`{slug}.ayushman.app`) resolved in `middleware.ts`, used purely for UI routing/branding (which tenant's theme/layout to render, redirecting a mismatched user, blocking `SUSPENDED` tenants at the edge).
  - **Express (backend/API):** never trusts the subdomain a request arrived on. Every request carries the Supabase-issued JWT (`Authorization: Bearer <token>`); an Express middleware verifies it (see §7 Auth) and reads `tenant_id`/`is_super_admin` straight off the verified claims, then calls `SET app.tenant_id = '<tenant_id>'` (via `SET LOCAL` inside the request's DB transaction) so Postgres RLS enforces isolation. This means tenant scoping is enforced at the database layer regardless of what the Next.js app sends — a compromised or buggy frontend cannot widen access.
  - A tenant's users can never manually override which tenant they're scoped to, in either layer.
- **Pinecone / RAG isolation:** one namespace per tenant (or, at minimum, mandatory metadata filter on `tenantId` **and** `caseId` on every query) — enforced at the retrieval-service layer, not left to prompt instructions (per Edge Case #28 in v0.1).
- **Storage isolation:** Supabase Storage buckets use a `{tenantId}/{caseId}/...` path prefix; signed URLs are generated per-request and scoped to that prefix only.
- **Cross-tenant Super Admin access is still logged.** Even though `SUPER_ADMIN` is unrestricted, every read of tenant data by a Super Admin writes an `AuditLog` entry (actor, tenant, entity, reason field mandatory for anything beyond the tenant list/billing dashboard). Unrestricted ≠ invisible — this protects you if a tenant ever asks "who looked at our data."

### 1.3 New / changed entities for multi-tenancy

- **`Tenant`** — `id`, `slug` (subdomain), `customDomain` (nullable), `displayName`, `logoUrl`, `themeConfig` (JSON), `status` (`ACTIVE`|`SUSPENDED`|`ARCHIVED`), `planTier`, `createdAt`, `createdBySuperAdminId`
- **`TenantSettings`** — `id`, `tenantId` (FK), `defaultCurrency`, `payoutCycle`, `bookingCutoffHours`, `autoApproveBookings` (bool), `brandingColors`, `supportedLanguages[]`
- **`Subscription` / `TenantBilling`** — `id`, `tenantId` (FK), `planName`, `mrr`, `status` (`TRIALING`|`ACTIVE`|`PAST_DUE`|`CANCELLED`), `renewsAt`, `platformCommissionPct`
- **`User`** — add `tenantId` (nullable — null only for `SUPER_ADMIN`), `role` enum extended to `SUPER_ADMIN`|`TENANT_ADMIN`|`CONSULTANT`|`CLIENT`
- All v0.1 entities (`Case`, `Appointment`, `Interaction`, `Commitment`, `Task`, `Document`, `AISummary`, `ChatMessage`, `Notification`, `Payment`, `Review`, `AuditLog`) — add `tenantId` (FK, indexed, RLS-enforced)
- **`Grievance`** (new — see §7) — `id`, `tenantId` (FK, for context only), `clientId` (FK), `subjectType` (`CONSULTANT`|`TENANT_ADMIN`|`BILLING`|`PLATFORM`|`OTHER`), `subjectConsultantId` (nullable FK), `caseId` (nullable FK), `category` (`SERVICE_QUALITY`|`MISCONDUCT`|`BILLING_DISPUTE`|`DATA_PRIVACY`|`OTHER`), `description`, `attachmentUrls[]`, `severity` (`LOW`|`MEDIUM`|`HIGH`|`CRITICAL`), `status` (`OPEN`|`UNDER_REVIEW`|`RESOLVED`|`DISMISSED`), `assignedToSuperAdminId` (nullable), `resolutionNotes`, `resolvedAt`, `submittedAt`
- **`AppointmentSeries`** (new) — `id`, `tenantId`, `caseId` (FK), `consultantId`, `clientId`, `recurrenceRule` (dayOfWeek/time + start date + end date or occurrence count), `status` (`ACTIVE`|`COMPLETED`|`CANCELLED`); `Appointment` gets a new nullable `seriesId` (FK) so individual occurrences link back to their series and can be managed together or edited/cancelled individually.
- **`Case`** — add `tags[]` (string array, Consultant-editable, for CRM segmentation — e.g. "chronic," "VIP," "needs Hindi"; per-consultant, not shared tenant-wide).
- **`OutOfOfficePeriod`** (new) — `id`, `consultantId`, `startDate`, `endDate`, `autoReplyMessage`, `pausesNewBookings` (bool); new bookings and client messages during an active period are blocked/auto-replied without needing to individually block every slot.
- **`Referral`** (new, client→client growth) — `id`, `tenantId`, `consultantId`, `referringClientId`, `referredClientId` (nullable until the invitee signs up), `referralCode`, `rewardType` (`DISCOUNT_CODE`|`CREDIT`|`NONE`), `rewardStatus` (`PENDING`|`GRANTED`), `createdAt`
- **`ConsultantReferral`** (new, cross-consultant within a tenant) — `id`, `tenantId`, `fromConsultantId`, `toConsultantId`, `clientId`, `sourceCaseId`, `contextNote` (carried-over summary, not raw private notes unless explicitly shared), `status` (`PENDING`|`ACCEPTED`|`DECLINED`), `createdAt`; on acceptance, a new `Case` is created under `toConsultantId` seeded with `contextNote`.
- **`Review`** — add `npsScore` (nullable, 0–10) alongside the existing 1–5 `rating`, so post-session feedback captures both a quick star rating and a richer likelihood-to-recommend signal.
- _(Analytics, no new core entity)_ — "Smart slot suggestions" and the "overbooking/burnout indicator" are computed from existing `Appointment` (cancellation/no-show patterns by time slot) and `Commitment`/`Task` (overdue counts) data; implement as a scheduled aggregation job writing to a lightweight `ConsultantAnalyticsSnapshot` cache table rather than querying raw history live on every dashboard load.

### 1.4 Permission matrix (summary)

| Action                                      |   Super Admin    |             Tenant Admin              |    Consultant    |               Client                |
| ------------------------------------------- | :--------------: | :-----------------------------------: | :--------------: | :---------------------------------: |
| Create/suspend a tenant                     |        ✅        |                  ❌                   |        ❌        |                 ❌                  |
| Invite/remove Consultants in a tenant       |        ✅        |            ✅ (own tenant)            |        ❌        |                 ❌                  |
| Edit tenant branding/billing                |        ✅        |            ✅ (own tenant)            |        ❌        |                 ❌                  |
| View all Consultants' calendars in a tenant |        ✅        |            ✅ (own tenant)            |  ❌ (own only)   |                 ❌                  |
| Log Interactions/Commitments/Tasks          |        ✅        | ❌ (not a Consultant unless also one) | ✅ (own clients) |                 ❌                  |
| View own case timeline                      |        ✅        |  ✅ (own tenant, escalation-logged)   | ✅ (own clients) |           ✅ (own cases)            |
| Query AI assistant                          |        ✅        |                  ❌                   | ✅ (own clients) |     ✅ (shared summaries only)      |
| View private clinical/legal notes           |        ✅        |       🔒 logged escalation only       | ✅ (own clients) |              ❌ never               |
| Submit a grievance/complaint                |      ➖ n/a      |                ➖ n/a                 |      ➖ n/a      | ✅ (any tenant they're a client of) |
| View/resolve grievances                     | ✅ (all tenants) |         ❌ by design (see §7)         |        ❌        | ✅ (own submissions & status only)  |

---

## 2. Everyday-Life Features for Consultants (new, added on top of v0.1's core loop)

These are the features that make the difference between "a system I have to fight with" and "a system that has my back" for a solo professional juggling many clients:

1. **Morning briefing view** — one page, generated fresh each login: today's appointments in order, one-line AI recap per appointment, anything overdue (commitments/tasks), unread client messages.
2. **Quick-capture widget** (available from anywhere in the dashboard, not just inside a session) — a floating "+ Note" / "🎙 Record" button so a Consultant can log a thought about a client between sessions, on mobile, without navigating to that Case first.
3. **Client search & pinning** — global search across all of a Consultant's clients by name/phone/tag; ability to pin frequently-seen clients to the top of the client list.
4. **Commitment/Task templates** — a saveable library of common commitments and tasks per category (e.g., a Physiotherapist's "do these 3 stretches daily" recurs across many clients) so they aren't retyped every session.
5. **Calendar sync (outbound)** — one-way `.ics` feed / Google Calendar push of the Consultant's Ayushman appointments, so they don't need to check two calendars.
6. **Click-to-call / click-to-WhatsApp** a client directly from their Case page (via Twilio), with the call/message auto-logged as an ad-hoc Interaction prompt afterward ("Log what was discussed?").
7. **Waitlist for cancelled slots** — when a client cancels, the Consultant can notify a waitlist for that slot instead of it going empty.
8. **End-of-day digest** — automated evening email/notification: sessions completed, commitments/tasks created today, anything still open.
9. **Personal scratchpad** — a private, never-shared, never-RAG-indexed space per Consultant for their own thinking, separate from Case notes.
10. **Keyboard-first session logging** — shortcuts to start/stop recording, save note, and log a commitment/task without leaving the keyboard, for speed between back-to-back sessions.
11. **Offline-safe note drafts** — notes typed during a network drop are held in local browser storage and synced once connectivity returns, never silently lost.
12. **Referral/source tracking** — tag how a client found the Consultant (for their own business insight, not shared with the client).
13. **Recurring appointment series** — book "every Tuesday for 6 weeks" once instead of one slot at a time (high-value for Physio treatment plans, ongoing therapy); individual occurrences remain editable/cancellable on their own.
14. **Out-of-office auto-responder** — pauses new booking requests and auto-replies to client messages during travel/leave, without manually blocking every slot.
15. **Client segmentation/CRM tags** — beyond pinning, tag clients (e.g. "chronic," "VIP," "needs Hindi") and filter/bulk-message by tag.
16. **Cross-consultant referral (same tenant)** — hand a client sideways to a colleague within the same tenant with context carried over, instead of the client re-explaining everything from scratch.
17. **Overbooking/burnout indicator** — a soft dashboard warning if booked hours or overdue-commitment count is trending unsustainably high.
18. **Smart slot suggestions** — surface which times tend to get cancelled/no-showed on, so availability can be adjusted proactively instead of just reacting after the fact.
19. **Referral tracking + reward** — a formal client-invites-client program (distinct from #12's passive source tagging): generate a referral code/link, see when a client refers another, and optionally reward it (discount code, credit).

## 3. Features Required While Interacting With Clients

These are the moments a Client directly touches the product:

1. **WhatsApp/SMS reminders** (not just email/in-app) for upcoming appointments and due tasks — critical per v0.1 Edge Case #20 (older demographics may not check the app).
2. **Add-to-calendar button** on every booking confirmation (Google/Outlook/Apple `.ics`).
3. **Downloadable session summary / receipt (PDF)** — the client-shared portion of the AI recap plus payment receipt, for their own records.
4. **Post-session rating & review** (maps to v0.1 `Review` entity) with a lightweight one-tap flow.
5. **Saved payment method** (tokenized via Razorpay) so repeat bookings don't require re-entering card details.
6. **Dependent/family profiles** — a Client can add a linked minor or dependent profile (ties into guardian-consent handling from v0.1 Edge Case #38) and book on their behalf.
7. **Mobile camera document upload** — snap a photo of a prescription/report directly instead of requiring a desktop scan.
8. **Language toggle** for the client-facing UI, matching the Consultant's `languagesSpoken`.
9. **"My upcoming tasks" widget** front-and-center on the client dashboard (not buried) — this is their main reason to log back in between sessions.
10. **Help / FAQ chat** (rule-based, not the case-scoped AI) for booking/payment questions that don't need a Consultant.
11. **Timeline export** — a client can export their own case timeline/documents (supports the "right to data portability" alongside v0.1's deletion-rights discussion).
12. **In-app join reminder** _(shared with Consultant)_ — a push notification ~10 minutes before an appointment surfacing the external video link front and center, instead of it being buried in an earlier confirmation email.
13. **Structured post-session feedback** _(shared with Consultant)_ — a lightweight NPS-style prompt ("how likely are you to recommend this Consultant?") alongside the star rating, giving richer signal than a star alone while staying a one-tap flow for the Client.

---

## 4. Client Grievance & Reporting System (new)

A persistent, tenant-agnostic way for a Client to raise a concern that goes **straight to the platform**, bypassing that tenant's own Tenant Admin — because the grievance may well be _about_ that Tenant Admin or one of their Consultants, and a suppressible-by-the-accused reporting channel isn't a real reporting channel.

### 4.1 How it works

- **Entry point is visible on every tenant, everywhere a Client is logged in** — a persistent "Report a concern" link in the client-facing layout footer/nav (not buried in a settings submenu), present across all tenant subdomains uniformly, since it's a platform-level feature, not a tenant-configurable one (a tenant can't disable or hide it).
- Client fills a short form: subject of the grievance (Consultant / Tenant Admin / Billing / Platform / Other), optional link to the relevant Case, category, free-text description, optional attachments (e.g., a screenshot).
- On submit, a `Grievance` row is created with `tenantId` stored **for context only** — it does not grant the tenant's own admin visibility (see permission matrix in §1.4).
- **Routing:** every new `Grievance` notifies `SUPER_ADMIN` (in-app + email; SMS as well if `severity = CRITICAL`). The Super Admin console shows a global inbox across all tenants.
- Super Admin triages: assigns severity, marks `UNDER_REVIEW`, investigates (using their unrestricted cross-tenant access, which itself writes an `AuditLog` entry per §1.2), and resolves with notes visible back to the submitting Client (`RESOLVED`/`DISMISSED`).
- The Client can track their own submission's status at any time but never sees other clients' grievances, and — deliberately — the Tenant Admin and Consultant of that tenant never see this queue at all, in any form.

### 4.2 Why the Tenant Admin is excluded by design

This is the one place in the system where the normal "tenant admins can see their own tenant's activity" rule is intentionally broken. A grievance channel a bad-actor Tenant Admin or Consultant could read (or worse, quietly resolve) protects nobody. If you'd like an _escalation-back-down_ path — e.g., a resolved, anonymized, aggregate "grievance count" surfaced to a Tenant Admin for their own quality tracking, without exposing content or complainant identity — flag it and I'll add it as a v2 feature; I haven't included it by default since it risks re-identifying the complainant in a small tenant.

### 4.3 Edge cases to plan for

- **Grievance about the platform/Super Admin itself** — needs an out-of-band channel (e.g., a fixed support email), since routing it to Super Admin defeats the purpose. Flagging as an open question in §6.
- **Abuse/spam submissions** — basic rate-limiting per Client per day; repeated frivolous submissions visible to Super Admin as a pattern, not auto-blocked (a genuine complainant shouldn't be silenced by a rate limiter).
- **Grievance tied to an active dispute already in a Tenant Admin's dispute queue** (v0.1 FR36) — these are different tracks: Tenant Admin disputes are about booking/payment/no-show mediation _within_ the tenant; Grievances are for concerns the Client doesn't trust that tenant to handle fairly. A Client can use either or both.

---

## 5. Full Page-by-Page Build Plan (`page.tsx` by `page.tsx`)

Ordered **the way you'd actually build it, most important first** — foundation and tenancy first (nothing works without it), then the booking/session/commitment loop that _is_ the product, then the retention and money layers, then AI and growth features on top, then polish. Within each phase, higher-priority features are listed first. New features from this round (recurring series, out-of-office, CRM tags, cross-consultant referral, join reminders, NPS feedback, smart suggestions, burnout indicator, and client-referral rewards) are placed at the earliest phase where they naturally belong rather than tacked on at the end — e.g. recurring series lands in the core booking phase (high priority, direct product value), while smart-slot-suggestions and the referral program land later since they depend on having real usage history and an established client base first.

Route convention: `app/(platform)/...` = Super Admin control plane (`admin.ayushman.app`); `app/(tenant)/[tenantSlug]/(admin)/...` and `(consultant)/...` = tenant back-office; `app/(tenant)/[tenantSlug]/(public)/...` and `(client)/...` = tenant-facing site.

**Branding boundary:** only `app/(tenant)/[slug]/(public)/page.tsx` (the landing page) and its sibling routes under the tenant-scoped `layout.tsx` are tenant-branded. `app/(auth)/login`, `app/(auth)/reset-password`, and `app/(auth)/register` are a single shared bundle with no tenant theming — Consultants and Clients across every tenant see the identical login page, reached at their own tenant's subdomain (`{slug}.ayushman.app/login`), and only the landing page changes per tenant.

### Phase 0 — Foundation (must exist before anything else)

| Page                                             | New features to build in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/middleware.ts`                         | Subdomain → tenant resolution for **UI routing only**; blocks requests for `SUSPENDED`/unknown tenants with a branded "this practice is unavailable" page. **`(auth)` routes (`/login`, `/reset-password`, `/register`) are explicitly exempted from tenant-theme resolution** — they resolve and render on any tenant's subdomain (`{slug}.ayushman.app/login`) or the platform domain, but the middleware does not fetch or attach that tenant's `theme_config`/logo for these paths.                                                                                                       |
| `apps/api/src/middleware/tenant.ts` (new)        | The real enforcement boundary: verifies the Supabase JWT on every request, reads `tenant_id`/`is_super_admin` off it, sets `app.tenant_id` for the request's DB transaction so RLS applies — never trusts a client-supplied header/subdomain (§1.2, §7.3).                                                                                                                                                                                                                                                                                                                                    |
| `app/(auth)/login/page.tsx`                      | **One shared page/bundle for every tenant** — same component tree, same styling, no tenant lookup at render time. Served at `{slug}.ayushman.app/login` regardless of which tenant subdomain it's reached from (and at the platform domain for Super Admin). Role-aware post-auth redirect (`SUPER_ADMIN` → platform console, others → their tenant's subdomain); OTP + password; "wrong tenant" detection if a user's token doesn't match the subdomain they're on. Intentionally **not** themed — this is the one page in the app that looks identical no matter whose subdomain served it. |
| `app/(auth)/reset-password/page.tsx`             | Same "shared, generic page" treatment as `login/page.tsx` above. Note the _page_ is generic even though the _outbound email_ it triggers is tenant-branded (separate concern — Supabase Auth email templates are configured per tenant; the in-app form is not).                                                                                                                                                                                                                                                                                                                              |
| `app/layout.tsx` (root)                          | Minimal, tenant-agnostic shell (fonts, providers, global CSS reset). Wraps `(platform)` and `(auth)` — **deliberately does not read `TenantSettings.themeConfig`**, which is what keeps login/reset-password/platform-console generic.                                                                                                                                                                                                                                                                                                                                                        |
| `app/(tenant)/[slug]/layout.tsx` (tenant-scoped) | The **only** layout that injects `TenantSettings.themeConfig`/logo and the role-based nav shell. Wraps everything under a tenant's slug — `(public)` landing/book/help, `(admin)`, `(consultant)`, `(client)` — which is why the landing page varies per tenant while `(auth)` does not.                                                                                                                                                                                                                                                                                                      |

### Phase 1 — Platform / Super Admin console (tenants must exist first)

| Page                                               | New features to build in                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(platform)/dashboard/page.tsx`                | Cross-tenant KPIs: active tenants, MRR, bookings this week, transcription queue health, flagged disputes needing platform attention.                                                                    |
| `app/(platform)/tenants/page.tsx`                  | List/search all tenants; status filter (`ACTIVE`/`SUSPENDED`); **Create Tenant** action (provisions slug, default Tenant Admin account, sends invite).                                                  |
| `app/(platform)/tenants/[tenantId]/page.tsx`       | Single-tenant deep view: usage stats, billing status, staff list, suspend/reinstate/delete tenant, **logged "view tenant data" escalation** button (reason required, writes AuditLog).                  |
| `app/(platform)/billing/page.tsx`                  | Subscription/plan management per tenant, commission rates, invoice history.                                                                                                                             |
| `app/(platform)/audit-log/page.tsx`                | Global, filterable audit trail across all tenants (platform-only view).                                                                                                                                 |
| `app/(platform)/grievances/page.tsx`               | **New:** global grievance inbox across all tenants — filter by tenant/category/severity/status, assign to self, bulk-triage.                                                                            |
| `app/(platform)/grievances/[grievanceId]/page.tsx` | **New:** single grievance detail — full description/attachments, linked Case (if any) opened via logged escalation access, resolution notes, resolve/dismiss actions, notifies Client on status change. |
| `app/(platform)/settings/page.tsx`                 | Platform-wide config: supported categories list, global notification providers (Twilio/Resend keys), feature flags per plan tier.                                                                       |

### Phase 2 — Tenant onboarding & staff management

| Page                                                              | New features to build in                                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(admin)/onboarding/page.tsx`                 | First-login wizard for a new Tenant Admin: set branding/logo, business hours defaults, payout account, add first Consultant.                         |
| `app/(tenant)/[slug]/(admin)/consultants/page.tsx`                | Tenant Admin's CRUD list of Consultants: invite, deactivate, edit permissions, view each one's booking/utilization stats.                            |
| `app/(tenant)/[slug]/(admin)/consultants/[consultantId]/page.tsx` | Single Consultant's admin-facing profile: license docs review, "Accept Bookings" toggle override, case count, dispute flags.                         |
| `app/(tenant)/[slug]/(admin)/settings/page.tsx`                   | Tenant-wide settings: branding, currency, booking cutoff window, auto-approve toggle, supported languages.                                           |
| `app/(tenant)/[slug]/(admin)/billing/page.tsx`                    | Tenant's own subscription plan, invoices, payout account details.                                                                                    |
| `app/(tenant)/[slug]/(admin)/disputes/page.tsx`                   | Tenant Admin dispute-mediation queue (payment/no-show disputes escalated from Consultants), with logged-access into the relevant Case per v0.1 FR36. |

### Phase 3 — Consultant profile & availability setup

| Page                                                      | New features to build in                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(consultant)/onboarding/page.tsx`    | Category selection, sub-specialization, qualifications/license upload (correctly-named PDFs, displayed on public profile per your Open Question #4), bio, fee, languages.                                                                                  |
| `app/(tenant)/[slug]/(consultant)/availability/page.tsx`  | Recurring weekly slots + date overrides (vacation blocks), buffer times; **new:** bulk "block this week" action, DST-safe recurring slot preview.                                                                                                          |
| `app/(tenant)/[slug]/(consultant)/profile/page.tsx`       | Editable public profile (photo, bio, fee, "Accept Bookings" toggle); **new:** calendar-sync (.ics feed) opt-in and link.                                                                                                                                   |
| `app/(tenant)/[slug]/(consultant)/out-of-office/page.tsx` | **New:** set an Out-of-Office period (start/end date, auto-reply message, whether it pauses new bookings) — priority build here since it directly prevents the "vacation after slots are booked" edge case (v0.1 Edge Case #8) rather than reacting to it. |

### Phase 4 — Client-facing entry & booking loop

| Page                                                     | New features to build in                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(public)/page.tsx`                  | Tenant's public landing page — branded, shows the practice's Consultant(s), category, and a **Book Now** CTA.                                                                                                                                                                                                                                       |
| `app/(tenant)/[slug]/(public)/book/page.tsx`             | Slot picker (v0.1 FR5–FR7); **new:** dependent/family profile selector, language toggle, add-to-calendar on confirmation, waitlist opt-in if the desired slot is full; **new — high priority:** "book a recurring series" option (e.g. weekly for N weeks), creating an `AppointmentSeries` + its individual `Appointment` occurrences in one flow. |
| `app/(auth)/register/page.tsx` (tenant-scoped)           | Client signup: email/phone OTP; conditional profile sections per category (medical history only if booking Medical).                                                                                                                                                                                                                                |
| `app/(tenant)/[slug]/(client)/appointments/page.tsx`     | Client's appointment list; accept/decline reschedule proposals; cancel within cutoff; **new:** click-through to join external video link (Zoom/Meet) the Consultant added; **new:** series view — see/manage a recurring booking as a group, cancel the whole series or a single occurrence.                                                        |
| `app/(tenant)/[slug]/(consultant)/appointments/page.tsx` | Consultant's incoming requests queue: Approve / Propose Reschedule / Reject with reason; **new:** morning-briefing card at top (Phase-2 everyday-life feature #1); **new:** approve/manage a recurring series request as a single action rather than approving each occurrence individually.                                                        |
| `app/(tenant)/[slug]/(client)/report/page.tsx`           | **New:** grievance submission form (subject/category/description/attachments) + list of the Client's own past submissions with status; linked from a persistent nav/footer item in the `(client)` layout across every tenant.                                                                                                                       |

### Phase 5 — Session logging & timeline (the core value proposition)

| Page                                                                 | New features to build in                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(tenant)/[slug]/(consultant)/sessions/[appointmentId]/page.tsx` | "Start Session" flow: in-browser audio record → Whisper transcription status, rich-text notes, document upload with visibility toggle (client-shared vs. private), quick commitment/task logging inline.                                                                                                                 |
| `app/(tenant)/[slug]/(consultant)/clients/page.tsx`                  | Consultant's own client list; **new:** search, pinning, CRM tags (create/assign/filter by tag, bulk-message a tag group), "last seen"/"next appointment" columns.                                                                                                                                                        |
| `app/(tenant)/[slug]/(consultant)/clients/[caseId]/page.tsx`         | Full Case/timeline view: filterable, searchable chronological feed of Appointments/Interactions/Commitments/Tasks/Documents; **new:** quick-capture button, click-to-call/WhatsApp; **new:** "Refer to colleague" action (same-tenant only) opening the cross-consultant referral flow with a context note carried over. |
| `app/(tenant)/[slug]/(consultant)/referrals/page.tsx`                | **New:** incoming/outgoing cross-consultant referral queue — accept (auto-creates a new `Case` seeded with the referring Consultant's context note) or decline.                                                                                                                                                          |
| `app/(tenant)/[slug]/(client)/cases/[caseId]/page.tsx`               | Client's own read-only timeline (shared-visibility items only); **new:** timeline export button, downloadable PDF summaries.                                                                                                                                                                                             |

### Phase 6 — Commitments, Tasks & notifications

| Page                                                  | New features to build in                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(consultant)/dashboard/page.tsx` | Upcoming/overdue Commitments & Tasks across all clients (v0.1 FR20); **new:** template library picker when creating a new one, end-of-day digest preview.                                                                                                 |
| `app/(tenant)/[slug]/(client)/tasks/page.tsx`         | Client's "my tasks" view — front-and-center, mark complete, see due dates.                                                                                                                                                                                |
| `app/(tenant)/[slug]/(*)/notifications/page.tsx`      | Per-user notification preferences (channel: in-app/email/SMS/WhatsApp; lead time for due-soon alerts).                                                                                                                                                    |
| _(new notification types)_                            | `GRIEVANCE_SUBMITTED` (to Super Admin, SMS too if `CRITICAL`), `GRIEVANCE_STATUS_CHANGED` (to the submitting Client only), `SESSION_JOINING_SOON` (~10 min before an appointment, surfacing the external video link, sent to both Client and Consultant). |

### Phase 7 — Growth & Analytics

| Page                                                                | New features to build in                                                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(consultant)/dashboard/page.tsx` (extended)    | **New:** overbooking/burnout indicator — soft warning if booked hours or overdue-commitment count is trending unsustainably high, read from the `ConsultantAnalyticsSnapshot` cache.   |
| `app/(tenant)/[slug]/(consultant)/availability/page.tsx` (extended) | **New:** smart slot suggestions — highlight time slots with historically high cancellation/no-show rates so the Consultant can adjust availability proactively rather than reactively. |
| `app/(tenant)/[slug]/(consultant)/analytics/page.tsx`               | **New:** revenue/retention insight page — repeat-booking rate, average fee realized, busiest-hours heatmap; separate from the payout ledger (business insight, not accounting).        |
| `app/(tenant)/[slug]/(consultant)/referral-program/page.tsx`        | **New:** client-invite-a-client program — generate/share a referral code, see referral status, configure the reward (discount code/credit).                                            |
| `app/(tenant)/[slug]/(client)/refer/page.tsx`                       | **New:** client-facing referral page — get/share their own referral code, see rewards earned.                                                                                          |

### Phase 8 — Payments

| Page                                                | New features to build in                                                                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(client)/payments/page.tsx`    | Payment history, receipts/invoices download, saved payment method management.                                                                                                                   |
| `app/(tenant)/[slug]/(consultant)/payouts/page.tsx` | Consultant's payout ledger (gross fee – commission), payout account setup.                                                                                                                      |
| Checkout flow (`(public)/book` → payment step)      | Razorpay order/capture; refund-policy display before booking confirmation; **new:** handles payment for an entire recurring series upfront, or per-occurrence (configurable by the Consultant). |

### Phase 9 — AI Assistant (RAG)

| Page                                                                       | New features to build in                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(consultant)/clients/[caseId]/ai/page.tsx` (or panel) | Case-scoped chat; "Generate session recap" one-click; citation links back to source Interaction/Document; thumbs up/down feedback. |
| `app/(tenant)/[slug]/(client)/cases/[caseId]/ai-summary/page.tsx`          | Client view of Consultant-shared AI summaries only (never a query interface into private notes).                                   |

### Phase 10 — Reviews, disputes, oversight

| Page                                                             | New features to build in                                                                                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tenant)/[slug]/(client)/appointments/[id]/review/page.tsx` | One-tap post-session rating & review; **new:** structured NPS-style prompt ("how likely to recommend?") alongside the star rating, feeding the Consultant's analytics (Phase 7). |
| `app/(tenant)/[slug]/(admin)/audit-log/page.tsx`                 | Tenant-scoped audit log (Tenant Admin's escalated-access history).                                                                                                               |

### Phase 11 — Polish

| Page                                                | New features to build in                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app/(tenant)/[slug]/(*)/profile/settings/page.tsx` | Personal account settings, language, dark mode, keyboard-shortcut reference (per everyday-life feature #10). |
| `app/(tenant)/[slug]/(public)/help/page.tsx`        | Client-facing FAQ/help chat (rule-based, non-case-scoped).                                                   |

---

## 6. Open Points I'd Like Your Call On

1. Should a `TENANT_ADMIN` ever be allowed to log their own sessions as a Consultant using the _same_ login, or must they always create a separate Consultant account for themselves? (Affects whether `role` is a single enum or a set of flags on `User`.)
2. Should Clients be tenant-scoped only (can't reuse one login across two different practices' subdomains), or should a Client identity span tenants (one login, multiple tenant memberships)? This significantly changes the `User`/`ClientProfile` relationship.
3. For tenant provisioning — fully self-serve (a practice signs up and gets a tenant instantly) is out of scope per your answer (Super Admin creates tenants), correct? Worth stating explicitly in §4 Scope for v2 vs. later self-serve.
4. **New:** what channel handles a grievance about the platform/Super Admin itself, since routing it to Super Admin's own inbox defeats the purpose? (e.g., a fixed external support email.)
5. **New:** do you want an anonymized, aggregate grievance-count metric surfaced back to a Tenant Admin for their own quality tracking (no content, no complainant identity), or should the Tenant Admin have zero visibility into the existence of grievances against their tenant at all?

---

## 7. Tech Stack & Architecture (v0.3 — Next.js + Express monorepo)

### 7.1 Why this revision

v0.2 assumed Next.js Route Handlers/Server Actions as the only backend. v0.3 splits frontend and backend into a **monorepo** with a standalone **Express** API service, so the API can be deployed, scaled, and reasoned about independently of the Next.js app (and reused later by a mobile client if needed). Supabase remains the multi-tenancy backbone (Postgres + RLS + Auth + Storage) — that choice doesn't change, only who talks to it and how.

### 7.2 Monorepo layout (Turborepo)

```
ayushman/
├── apps/
│   ├── web/          # Next.js 16 — all app/(...)/page.tsx routes from §5, calls the API via fetch/SWR
│   └── api/          # Express — REST endpoints, cron jobs, RAG/transcription workers
├── packages/
│   ├── db/           # Prisma schema + generated client, shared by api (and by web only for read-only server-side data fetching if ever needed)
│   ├── types/        # Shared TS types/Zod schemas (Case, Appointment, Grievance, etc.) — single source of truth for both apps
│   ├── ui/            # Shared Tailwind/Radix components (if design system grows beyond apps/web)
│   └── config/        # Shared eslint/tsconfig/tailwind config
├── turbo.json
└── package.json
```

`apps/web` never talks to Postgres directly — it calls `apps/api` over HTTP. This keeps RLS enforcement, tenant-claim verification, and business logic in one place instead of split across a Next.js server and an Express server.

### 7.3 Auth — chosen approach: Supabase Auth, used natively by both apps

For a multi-tenant system already committed to Supabase for Postgres + RLS, **Supabase Auth is the easiest correct choice** here — easier than rolling a custom JWT/bcrypt auth layer, and easier than bolting on a third-party auth provider:

- **Tenant claims are stamped in the database, not in application code.** A Postgres Auth Hook attaches `tenant_id` and `is_super_admin` to every access token at sign-in. Neither `apps/web` nor `apps/api` has to implement claim logic, refresh-token rotation, or session storage — Supabase issues and refreshes the JWT; both apps just verify it.
- **One identity system, two consumers.** `apps/web` uses `@supabase/ssr` for cookie-based session handling (login, OTP, password reset, session refresh) — no custom auth UI plumbing needed. `apps/api` is stateless: it verifies the same JWT on every request (via the Supabase project's JWT secret, or `supabase-js`'s `auth.getUser()`), extracts `tenant_id`/`role`/`is_super_admin`, and sets the Postgres session variable for RLS. No shared session store or sticky sessions required between the two apps.
- **RLS becomes the single source of truth for isolation**, straight off the JWT — the exact mechanism already specified in §1.2 — rather than needing tenant checks duplicated in Express middleware _and_ the database. This is the main reason a custom JWT/bcrypt implementation would be **harder** here: it would mean rebuilding password hashing, token issuance/rotation, and OTP delivery yourself, and still wiring tenant scoping into Postgres by hand.
- **Built-in primitives this app already needs:** email/password + OTP (Phase 0 login), password reset (Phase 0), and per-tenant branded email templates all ship with Supabase Auth rather than requiring custom implementation.

**Practical effect on the dependency list below:** the backend does not need `jsonwebtoken`/`bcryptjs` for primary user authentication — only `@supabase/supabase-js` for token verification and admin operations (e.g., Super Admin provisioning a new Tenant Admin). If a future requirement needs a _second_, non-Supabase-user identity (e.g., machine-to-machine API keys for a third-party integration), add `jsonwebtoken` scoped to that narrow case only — not for user auth.

### 7.4 Dependencies

| Layer                     | Package                                         | Purpose                                                                                        |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Frontend** (`apps/web`) | Next.js 16, React 19, TypeScript                | App Router, Server Components, tenant-subdomain middleware                                     |
|                           | Tailwind v4                                     | Styling                                                                                        |
|                           | SWR                                             | Data fetching/caching against the Express API                                                  |
|                           | Zod                                             | Shared request/response validation (mirrors `packages/types`)                                  |
|                           | Radix icons                                     | Icon set                                                                                       |
|                           | `@supabase/ssr`, `@supabase/supabase-js`        | Session/cookie-based auth: sign-in, OTP, password reset                                        |
| **Backend** (`apps/api`)  | Express                                         | REST API, tenant-scoped routes, webhooks (Razorpay, Twilio)                                    |
|                           | Prisma                                          | Schema/migrations + typed queries against Supabase Postgres                                    |
|                           | Supabase PostgreSQL + RLS                       | Multi-tenant data isolation (§1.2)                                                             |
|                           | `@supabase/supabase-js`                         | JWT verification (`auth.getUser()`), Storage/admin operations, Auth Hook management            |
|                           | Node-cron                                       | Scheduled jobs — end-of-day digest, `ConsultantAnalyticsSnapshot` aggregation, waitlist sweeps |
| **DevTools**              | TypeScript, PostCSS, Turbo                      | Monorepo build/lint/type-check orchestration across `apps/*` and `packages/*`                  |
| **Storage**               | Supabase Storage                                | Tenant-prefixed bucket paths (§1.2), signed URLs issued by `apps/api`                          |
| **Transcription**         | Whisper via Hugging Face                        | Async, triggered from `apps/api`                                                               |
| **AI Chat / RAG**         | LLM + Pinecone                                  | Namespaced per tenant, hard-scoped by `tenantId` + `caseId`, queried from `apps/api`           |
| **Payments**              | Razorpay                                        | Per-tenant payout accounts, webhook handled in `apps/api`                                      |
| **Notifications**         | Twilio (SMS/WhatsApp) + Resend (email) + in-app | Triggered from `apps/api` cron/event handlers                                                  |

### 7.5 What changes in the §5 build plan

The `page.tsx` files in §5 are unaffected as _pages_ — they still live under `apps/web/app/...` with the same route conventions. What changes: every page that previously implied a Next.js Route Handler or Server Action now calls a corresponding `apps/api` REST endpoint (e.g., `POST /api/tenants/:tenantId/cases/:caseId/interactions` instead of an inline Server Action). `middleware.ts` in Phase 0 is frontend-only tenant routing; the equivalent tenant-scoping middleware in `apps/api` (verify JWT → set `app.tenant_id` → attach `req.tenant`) should be treated as its own Phase 0 deliverable.
