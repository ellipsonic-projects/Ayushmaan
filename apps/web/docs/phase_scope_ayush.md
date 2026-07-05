# Ayushman — Phase Scope & Roadmap

**Version**: 1.0.0
**Last Updated**: July 2026

---

## Overview

Ayushman ships in **5 phases**, each a cohesive, demoable slice built on the previous one. Each deployment is a **single-consultant practice** — clients book directly (no discovery/search). The Consultant may invite **org Admins** (staff) as the practice scales. Scope follows the PRD's v1 boundary (§4): consultant/client onboarding, direct booking, session logging, commitments/tasks, timeline, and Razorpay payments. Items explicitly out of scope for v1 (multi-consultant clinics, consultant marketplace/discovery, native mobile, insurance billing, e-prescriptions, embedded video, international payments, group sessions) are deferred to Phase 5 or later.

> **Scope note — AI Assistant (RAG):** the PRD's §4/§7.6 describes an AI chat/recap feature (FR23–28). It has been **descoped from the current build plan** (see `data_API_ayush.md` §18) and moved to the Phase 5 backlog pending re-evaluation of retrieval architecture and cost. No phase below depends on it.

```
Phase 0: Foundation (Weeks 1–3)
Phase 1: Core MVP — Onboarding & Direct Booking (Weeks 4–10)
Phase 2: Case Management — Sessions, Commitments & Documents (Weeks 11–17)
Phase 3: Trust, Payments & Compliance (Weeks 18–24)
Phase 4: Scale & Hardening (Weeks 25–30)
Phase 5: Post-v1 Backlog (Weeks 31+)
```

---

## Phase 0 — Foundation (Weeks 1–3)

**Goal**: Infrastructure, boilerplate, and data layer ready. No user-facing features.

### Deliverables

#### Infrastructure
- [ ] Supabase project provisioned (Postgres, Auth, Storage buckets: audio, documents, verification docs)
- [ ] Row-level security policies scaffolded (deny-by-default; per-`caseId` scoping)
- [ ] Redis (queue backend for transcription/notification jobs)
- [ ] Twilio account configured (SMS/WhatsApp) + email provider (SES or equivalent) verified
- [ ] Razorpay sandbox account + webhook endpoint scaffolded
- [ ] Hugging Face Whisper transcription pipeline (async worker) — sandboxed with sample audio
- [ ] Cloudflare DNS, Vercel project initialized

#### Codebase
- [ ] Monorepo (Turborepo): `apps/web`, `apps/api`, `packages/shared`
- [ ] Next.js 15 project bootstrapped (App Router, TypeScript, Tailwind CSS)
- [ ] API layer bootstrapped (TypeScript), Prisma schema defined for all §6 entities
- [ ] Initial migrations run against Supabase Postgres
- [ ] Seed data: consultant categories, sample org admin invite, sample availability
- [ ] Shared TypeScript types package (`packages/shared/types`) matching `data_API_ayush.md` §17
- [ ] ESLint, Prettier, Husky pre-commit hooks; GitHub Actions (lint + typecheck + test on PR)

#### Design
- [ ] Figma design system: colors, typography, components
- [ ] Wireframes: public `/book` page, booking flow, case timeline, session logging, dashboard
- [ ] High-fidelity mockups: consultant profile, timeline view, recording/notes screen

### Success Criteria
- API health check responds; Next.js app renders without errors
- Prisma migrations pass on staging; RLS policies block cross-tenant reads in a smoke test
- All team members can run the project locally

---

## Phase 1 — Core MVP: Onboarding, Direct Booking (Weeks 4–10)

**Goal**: A client can register and book directly with this instance's Consultant; the Consultant completes onboarding and manages availability. Enough to demo and start closed beta.

### Sprint 1.1 (Week 4–5): Auth & Profiles
- [ ] `POST /auth/register`, `/verify-otp`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` (FR1)
- [ ] `GET/PATCH /users/me`, `/clients/me`, `/consultants/me`
- [ ] Consultant selects exactly one primary category at signup (FR2)
- [ ] Client profile conditional sections (medical-history block etc., FR4) — deferred rendering until relevant booking
- [ ] Minor/guardian linkage fields on `ClientProfile` (edge case #38) — captured, enforcement logic in Phase 3
- [ ] Frontend: Register/Login, role selection, category picker

### Sprint 1.2 (Week 5–6): Consultant Credentials
- [ ] `POST /consultants/me/credentials` — tiered by category (FR3, edge case #42): license doc for Medical/Legal, identity doc for Astrology/Homeopathy/IT/Physio
- [ ] Presigned upload flow for credential PDFs, correctly named for UI display (open question #4)
- [ ] Consultant active immediately after profile save; bookability via `isAcceptingNewClients` toggle
- [ ] Frontend: credential upload as part of consultant onboarding (no Admin review panel)

### Sprint 1.3 (Week 6–7): Public Booking Page
- [ ] `GET /consultants/public` — this instance's single Consultant profile
- [ ] `GET /consultants/public/availability` — DST-safe slot expansion (edge case #6, #9)
- [ ] Frontend: `/book` page with profile + slot picker — **no discovery/search**

### Sprint 1.4 (Week 7–8): Availability
- [ ] `POST/PATCH/DELETE /consultants/me/availability` — recurring + date-specific overrides, buffers (FR6)
- [ ] `GET /consultants/:id/availability` — DST-safe slot expansion, timezone-labeled (edge case #6, #9)
- [ ] Frontend: availability manager (weekly grid + block-out calendar)

### Sprint 1.5 (Week 8–10): Booking Lifecycle
- [ ] `POST /appointments` with DB-level unique constraint on slot booking to prevent double-booking races (FR7, edge case #1)
- [ ] `PATCH /appointments/:id/respond` (approve/reschedule/reject, FR8)
- [ ] `PATCH /appointments/:id/reschedule-response` (FR9) + auto-expire job for unanswered proposals (edge case #5)
- [ ] `PATCH /appointments/:id/cancel` (FR10) with cutoff enforcement
- [ ] Auto-expire unanswered booking requests (edge case #4)
- [ ] Basic in-app notifications for booking lifecycle events (`GET /notifications`, mark-read)
- [ ] Frontend: booking flow, appointment status views for client + consultant

### Phase 1 Success Criteria
- Client can register and book directly with this instance's Consultant end-to-end (via `/book`)
- Consultant can register, publish availability, and approve/reject/reschedule bookings
- Double-booking is impossible under concurrent load (verified via test)
- Staging environment live and shareable for closed beta

### Phase 1 Metrics to Track
- Registration → profile completion rate (consultants)
- Landing/`/book` → booking conversion rate
- % of booking requests auto-expiring unanswered
- Average time from `REQUESTED` to `APPROVED`

---

## Phase 2 — Case Management: Sessions, Commitments & Documents (Weeks 11–17)

**Goal**: The core value proposition — logging sessions and never losing context — is fully working end-to-end.

### Sprint 2.1 (Week 11–12): Cases & Interactions
- [ ] `GET/PATCH /cases`, `/cases/:id`, `/cases/:id/close` with open-items guard (FR21, edge case #22, #37)
- [ ] `POST /interactions/start`, `POST /interactions/:id/consent` — consent gate before recording (FR11, edge case #11)
- [ ] Frontend: "Start Session" flow, consent prompt

### Sprint 2.2 (Week 12–13): Recording & Transcription
- [ ] In-browser audio capture; chunked upload for long recordings (edge case #14)
- [ ] `POST /interactions/:id/audio` → Supabase Storage → Whisper async worker
- [ ] Partial-capture recovery on network/browser failure (edge case #12)
- [ ] Transcription status polling + WebSocket `transcript:status` event; failed/low-confidence fallback to manual edit (FR13, edge case #13)
- [ ] Frontend: recording UI with live status, manual note editor alongside transcript

### Sprint 2.3 (Week 13–14): Notes & Documents
- [ ] `PATCH /interactions/:id` — rich-text notes (FR14)
- [ ] `POST /uploads/presigned-url`, `POST /documents` — type/size allow-list + async malware scan gate (FR15, edge case #23)
- [ ] Document versioning via `previousVersionId` (edge case #24)
- [ ] `PATCH /documents/:id/access` — explicit confirm-to-share with client (FR16, edge case #25)
- [ ] Soft-delete + recovery window for interactions/notes (edge case #16)
- [ ] Frontend: document upload, version history, visibility toggle with confirmation modal

### Sprint 2.4 (Week 14–15): Commitments & Tasks
- [ ] `POST/PATCH /commitments`, `POST/PATCH /tasks` (FR17, FR18)
- [ ] Scheduled job: auto-flag `MISSED`/`OVERDUE` past due date + notify (FR19, edge case #18)
- [ ] `GET /dashboard/deadlines` — cross-client widget (FR20)
- [ ] Frontend: commitment/task logging inline with session, dashboard deadlines widget

### Sprint 2.5 (Week 15–17): Timeline & Notifications
- [ ] `GET /cases/:id/timeline` — unified, filterable, paginated, full-text searchable (FR21/22)
- [ ] Multi-channel notifications: in-app + email + SMS/WhatsApp fallback for clients who don't engage in-app (FR29/30, edge case #20)
- [ ] `PATCH /notifications/preferences`
- [ ] Frontend: case timeline view, notification preference center

### Phase 2 Success Criteria
- A consultant can run a full session — record, transcribe (or note manually), log commitments/tasks, attach documents — and see it all reflected on the case timeline within seconds
- Overdue commitments/tasks reliably notify across channels
- Malicious/oversized file uploads are rejected before becoming accessible
- Closed beta consultants report the timeline as their primary "what happened last time" reference

### Phase 2 Metrics to Track
- Transcription success rate and average turnaround time
- % of sessions with at least one commitment/task logged
- Missed-commitment rate trending down week over week
- Timeline load time (p95) for cases with 100+ events

---

## Phase 3 — Trust, Payments & Compliance (Weeks 18–24)

**Goal**: Consultants get paid, clients get accountability, and sensitive-data handling meets the PRD's compliance bar.

### Sprint 3.1 (Week 18–19): Reviews
- [ ] `POST /reviews`, `GET /consultants/:id/reviews` (one review per appointment, `COMPLETED` only)
- [ ] Consultant review visibility controls (`isVisible` flag on reviews)
- [ ] Frontend: post-appointment review prompt, public review list

### Sprint 3.2 (Week 19–21): Razorpay Payments
- [ ] `POST /payments/orders`, `POST /payments/webhook` (signature-verified) (FR31)
- [ ] Reconciliation job for missed-webhook drift (edge case #32)
- [ ] Configurable pay-on-booking vs. pay-after-session per consultant
- [ ] `POST /payments/:id/refund` — policy-driven (full pre-session, none post-start, Consultant/org Admin override) (FR32, edge case #33)
- [ ] `GET /consultants/me/payouts`, blocked-payout handling for missing bank details (FR33, edge case #36)
- [ ] `GET /payments/:id/invoice` auto-generation (FR34)
- [ ] Frontend: payment modal (Razorpay SDK), payout ledger, invoice download

### Sprint 3.3 (Week 21–22): Access Control & Minors
- [ ] Row-level security audit across all Case-scoped tables (FR35)
- [ ] Guardian consent/linkage enforcement for minor clients on Medical/Legal cases (edge case #38)
- [ ] `AuditLog` writes on every org Admin read of clinical/legal content during disputes (edge case #41)

### Sprint 3.4 (Week 22–23): Org Admin Team & Disputes
- [ ] `POST /org/admins/invite`, `DELETE /org/admins/:userId` — Consultant invites staff Admins
- [ ] `GET/PATCH /org/disputes` — payment disputes, no-show claims (FR36)
- [ ] `GET /org/cases/:id/escalated-view` — justified, audited access
- [ ] `POST /org/clients/:id/deletion-request` — anonymize-vs-retain policy resolution (edge case #40, open question #2)

### Sprint 3.5 (Week 23–24): Security Hardening
- [ ] Rate limiting on all endpoints (Redis-backed)
- [ ] Column-level encryption for `transcriptText`/`notesText` on Medical/Legal cases
- [ ] Sentry error tracking (frontend + backend), structured logging
- [ ] Load testing (k6): target 300 concurrent sessions (recording + transcription in flight)
- [ ] Penetration testing: OWASP Top 10 checklist
- [ ] WCAG 2.1 AA audit

### Phase 3 Success Criteria
- End-to-end paid booking → session → payout flow works with Razorpay sandbox and production keys
- No cross-tenant data leakage under RLS penetration test
- Suspended consultants no longer accept bookings, but their former clients retain full timeline/document access
- Platform passes OWASP Top 10 review

---

## Phase 4 — Scale & Hardening (Weeks 25–30)

**Goal**: Production-grade performance and reliability at growing consultant/client volume.

- [ ] Connection pooling (PgBouncer/Supabase pooler); read-replica routing for GET-heavy timeline queries
- [ ] Queue scaling for transcription/notification workers (backpressure handling for long-audio spikes, edge case #14)
- [ ] CDN caching for public `/book` page and profile photos
- [ ] Database index review for `Case`, `Interaction`, `Commitment`, `Task` (timeline query hot paths)
- [ ] Storage lifecycle policies for audio/documents (archive older files to cheaper tiers, per NFR)
- [ ] Dependency/security patch cadence, Dependabot
- [ ] Test coverage push to 80%+ on booking, payments, and RLS-critical paths

### Phase 4 Success Criteria
- Timeline p95 load time stays under 300ms for cases with 500+ events
- System stable at target load: 1,000 concurrent sessions, 200 concurrent transcription jobs
- Zero P1 incidents during a 2-week soak test

---

## Phase 5 — Post-v1 Backlog (Weeks 31+)

Explicitly out of scope for v1 per PRD §4; sequenced here for future planning, not committed.

- [ ] **AI Assistant / RAG** (PRD §7.6, FR23–28) — case-scoped recap and Q&A, hard-scoped retrieval, citation requirements, clinical-advice guardrails. Requires a dedicated scoping pass before re-entering the roadmap.
- [ ] Multi-consultant clinics / shared staff access with limited-scope delegate roles
- [ ] Native mobile apps (iOS/Android) — currently responsive web only
- [ ] Insurance billing / claims integration
- [ ] E-prescriptions with regulatory-compliant e-signature and controlled-substance handling
- [ ] Embedded in-platform video calling (v1 uses external Zoom/Meet links only)
- [ ] International payment rails beyond Razorpay (multi-currency)
- [ ] Group/family sessions as a first-class entity
- [ ] Multi-speaker diarization in transcription (v1 assumes consultant-only speaker, open question #5)

---

## Technical Debt & Maintenance (Ongoing)

Allocated 20% of each sprint from Phase 1 onward:
- Dependency updates and vulnerability patching
- Test coverage improvements (target: 80%+ on booking/payment/RLS paths)
- Query performance profiling, index tuning
- Documentation updates (`data_API_ayush.md`, Prisma schema comments)

---

## Milestone Summary

| Milestone | Target Date | Key Deliverable |
|-----------|-------------|-----------------|
| Phase 0 Complete | Week 3 | Infrastructure + schema ready |
| Phase 1 Closed Beta | Week 10 | Direct booking & onboarding live |
| Phase 2 Feature Complete | Week 17 | Session logging, commitments, timeline live |
| Phase 3 Production Launch | Week 24 | Payments, compliance, security hardening |
| Phase 4 Scale-Ready | Week 30 | Load-tested for target volume |
| Phase 5 Backlog Review | Week 31+ | AI/mobile/insurance scoping begins |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Consultant onboarding drop-off (credential upload friction) | Medium | Medium | Self-attested credentials; tiered requirements by category reduce upload burden for lower-risk categories |
| Whisper transcription accuracy on regional accents/languages | Medium | Medium | Manual-edit fallback always available; original audio retained as source of truth |
| Client no-show for logging tasks (older demographics) | Medium | Medium | SMS/WhatsApp fallback notifications, not in-app only |
| Razorpay webhook delivery failures | Low | High | Reconciliation job; sandbox testing extensively pre-launch |
| Sensitive data exposure across cases (RLS bug) | Low | Critical | RLS penetration testing, DB-layer scoping (never prompt/app-layer only) |
| Regulatory: medical/legal record retention vs. deletion rights conflict | Medium | High | Explicit anonymize-vs-retain policy per category, legal review pre-launch |
| Minor-client consent handling gaps | Low | High | Guardian linkage enforced at profile + booking layer, not just a flag |
| Storage cost growth (audio/documents) | Medium | Medium | Lifecycle policies, tiered archival |
| Key employee departure | Low | Medium | Documentation, cross-training |

---

## Definition of Done

A feature is "Done" when:
1. ✅ Unit tests written and passing (>80% coverage for new code)
2. ✅ Integration tests written for API endpoints, including RLS/scoping tests for Case-linked data
3. ✅ Code reviewed and approved by ≥1 peer
4. ✅ Deployed to staging and smoke tested
5. ✅ All edge cases from the PRD (§9) relevant to the feature are documented and handled
6. ✅ Error states and empty states implemented in UI
7. ✅ API documented in `data_API_ayush.md`
8. ✅ Performance: API endpoint p95 < 300ms
9. ✅ No new ESLint errors introduced
10. ✅ Accessible: keyboard nav + screen reader tested
