# Ayushman — Project Structure (Multi-Tenant Edition)

Derived from `PRD_v2_multitenant.md`, `schema_ayushman_v2.md`, and `Application_Flow_v2.md`.
Stack: Next.js (App Router) + TypeScript + Tailwind + Prisma + Supabase (Postgres/RLS/Auth/Storage) + Pinecone + Razorpay + Twilio/Resend.

```
ayushman/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 0001_init_tenants_users/
│   │   ├── 0002_fk_tenants_created_by/          # deferred FK, see schema §2.1/§2.4
│   │   ├── 0003_cases_appointments_core/
│   │   ├── 0004_appointment_series/
│   │   ├── 0005_grievances/
│   │   ├── 0006_referrals_analytics/
│   │   └── ...
│   └── seed.ts
│
├── supabase/
│   ├── policies/                                 # raw SQL, mirrored from schema §5
│   │   ├── 01_tenant_isolation_generic.sql
│   │   ├── 02_super_admin_bypass.sql
│   │   ├── 03_tenant_admin_escalation_fn.sql
│   │   ├── 04_grievance_exception.sql
│   │   └── 05_chat_rag_scope.sql
│   ├── auth-hooks/
│   │   └── stamp-tenant-claim.sql                # JWT custom claim hook (tenant_id, is_super_admin)
│   └── storage-policies/
│       └── tenant-case-prefix.sql                # {tenantId}/{caseId}/... path scoping
│
├── src/
│   ├── middleware.ts                             # subdomain → tenant resolution; blocks SUSPENDED/unknown tenants
│   │
│   ├── app/
│   │   ├── (platform)/                           # admin.ayushman.app — Super Admin console
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tenants/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [tenantId]/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   ├── audit-log/page.tsx
│   │   │   ├── grievances/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [grievanceId]/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── (auth)/                               # shared, tenant-aware
│   │   │   ├── login/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── register/page.tsx                 # tenant-scoped client signup
│   │   │
│   │   ├── (tenant)/
│   │   │   └── [slug]/
│   │   │       ├── layout.tsx                    # theming from TenantSettings, role-based nav shell
│   │   │       │
│   │   │       ├── (public)/                     # no auth
│   │   │       │   ├── page.tsx                  # tenant landing
│   │   │       │   ├── book/page.tsx              # slot picker, series booking, waitlist
│   │   │       │   └── help/page.tsx              # rule-based FAQ chat
│   │   │       │
│   │   │       ├── (admin)/                      # Tenant Admin back-office
│   │   │       │   ├── onboarding/page.tsx
│   │   │       │   ├── consultants/
│   │   │       │   │   ├── page.tsx
│   │   │       │   │   └── [consultantId]/page.tsx
│   │   │       │   ├── settings/page.tsx
│   │   │       │   ├── billing/page.tsx
│   │   │       │   ├── disputes/page.tsx
│   │   │       │   └── audit-log/page.tsx
│   │   │       │
│   │   │       ├── (consultant)/                 # Consultant workspace
│   │   │       │   ├── onboarding/page.tsx
│   │   │       │   ├── dashboard/page.tsx         # morning briefing, burnout indicator
│   │   │       │   ├── appointments/page.tsx
│   │   │       │   ├── calendar/page.tsx
│   │   │       │   ├── availability/page.tsx      # + smart slot suggestions
│   │   │       │   ├── out-of-office/page.tsx
│   │   │       │   ├── profile/page.tsx
│   │   │       │   ├── clients/
│   │   │       │   │   ├── page.tsx               # search, pinning, CRM tags
│   │   │       │   │   └── [caseId]/
│   │   │       │   │       ├── page.tsx           # case timeline
│   │   │       │   │       └── ai/page.tsx        # case-scoped RAG chat panel
│   │   │       │   ├── sessions/
│   │   │       │   │   └── [appointmentId]/page.tsx
│   │   │       │   ├── referrals/page.tsx         # cross-consultant referral queue
│   │   │       │   ├── referral-program/page.tsx  # client-invite-a-client config
│   │   │       │   ├── analytics/page.tsx
│   │   │       │   └── payouts/page.tsx
│   │   │       │
│   │   │       ├── (client)/                     # Client-facing dashboard
│   │   │       │   ├── dashboard/page.tsx
│   │   │       │   ├── appointments/page.tsx
│   │   │       │   ├── calendar/page.tsx
│   │   │       │   ├── cases/
│   │   │       │   │   └── [caseId]/
│   │   │       │   │       ├── page.tsx
│   │   │       │   │       └── ai-summary/page.tsx
│   │   │       │   ├── tasks/page.tsx
│   │   │       │   ├── payments/page.tsx
│   │   │       │   ├── appointments/[id]/
│   │   │       │   │   ├── pay/page.tsx
│   │   │       │   │   └── review/page.tsx
│   │   │       │   ├── refer/page.tsx
│   │   │       │   └── report/page.tsx            # grievance submission (platform-level, always visible)
│   │   │       │
│   │   │       └── (*)/                          # shared across roles within a tenant
│   │   │           ├── notifications/page.tsx
│   │   │           └── profile/settings/page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── otp/route.ts
│   │   │   │   └── session/route.ts
│   │   │   ├── tenants/route.ts
│   │   │   ├── consultants/route.ts
│   │   │   ├── appointments/
│   │   │   │   ├── route.ts
│   │   │   │   └── series/route.ts
│   │   │   ├── cases/route.ts
│   │   │   ├── interactions/route.ts
│   │   │   ├── documents/route.ts
│   │   │   ├── commitments-tasks/route.ts
│   │   │   ├── payments/
│   │   │   │   ├── checkout/route.ts
│   │   │   │   └── webhook/route.ts               # Razorpay webhook
│   │   │   ├── grievances/route.ts
│   │   │   ├── referrals/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   ├── ai/
│   │   │   │   ├── chat/route.ts                  # RAG chat, tenantId+caseId scoped
│   │   │   │   └── recap/route.ts                 # session recap generation
│   │   │   ├── transcription/
│   │   │   │   └── webhook/route.ts               # Whisper async job callback
│   │   │   └── cron/
│   │   │       ├── end-of-day-digest/route.ts
│   │   │       ├── analytics-snapshot/route.ts    # ConsultantAnalyticsSnapshot job
│   │   │       └── reminders/route.ts              # due-soon, join-soon, out-of-office autoreply
│   │   │
│   │   ├── layout.tsx                             # root layout
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                                    # design-system primitives (buttons, inputs, modals)
│   │   ├── layout/
│   │   │   ├── TenantNav.tsx
│   │   │   ├── PlatformNav.tsx
│   │   │   └── RoleGuard.tsx
│   │   ├── booking/
│   │   │   ├── SlotPicker.tsx
│   │   │   ├── SeriesBookingForm.tsx
│   │   │   └── WaitlistToggle.tsx
│   │   ├── session/
│   │   │   ├── AudioRecorder.tsx
│   │   │   ├── QuickCaptureWidget.tsx
│   │   │   └── CommitmentTaskTemplates.tsx
│   │   ├── timeline/
│   │   │   ├── CaseTimeline.tsx
│   │   │   └── TimelineExportButton.tsx
│   │   ├── clients/
│   │   │   ├── ClientSearchPin.tsx
│   │   │   └── CrmTagManager.tsx
│   │   ├── ai/
│   │   │   ├── ChatPanel.tsx
│   │   │   └── CitationLink.tsx
│   │   ├── grievance/
│   │   │   ├── GrievanceForm.tsx
│   │   │   └── GrievanceStatusTracker.tsx
│   │   ├── referrals/
│   │   │   ├── CrossConsultantReferralModal.tsx
│   │   │   └── ClientReferralCard.tsx
│   │   ├── analytics/
│   │   │   ├── BurnoutIndicator.tsx
│   │   │   └── SlotHeatmap.tsx
│   │   └── notifications/
│   │       └── NotificationPreferences.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                              # Prisma client singleton
│   │   ├── supabase/
│   │   │   ├── server.ts                          # sets app.tenant_id / app.is_super_admin per request
│   │   │   ├── client.ts
│   │   │   └── storage.ts                         # signed URL helpers, tenant-prefixed paths
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   └── jwt-claims.ts
│   │   ├── tenant/
│   │   │   ├── resolve-tenant.ts                  # subdomain → tenant lookup (used by middleware)
│   │   │   └── theme.ts
│   │   ├── rag/
│   │   │   ├── pinecone-client.ts                 # namespaced per tenant
│   │   │   ├── retrieval.ts                       # hard-scoped tenantId + caseId filter
│   │   │   └── citations.ts
│   │   ├── payments/
│   │   │   └── razorpay.ts
│   │   ├── notifications/
│   │   │   ├── twilio.ts                          # SMS/WhatsApp
│   │   │   ├── resend.ts                          # email
│   │   │   └── dispatch.ts                        # routes by NotificationPreference/channel
│   │   ├── transcription/
│   │   │   └── whisper.ts
│   │   ├── audit/
│   │   │   └── log-access.ts                      # writes AuditLog for escalated/cross-tenant reads
│   │   ├── permissions/
│   │   │   └── matrix.ts                           # mirrors PRD §1.4 permission matrix
│   │   └── validation/
│   │       └── schemas.ts                          # zod schemas per entity
│   │
│   ├── hooks/
│   │   ├── useTenant.ts
│   │   ├── useRole.ts
│   │   ├── useOfflineDraft.ts                      # offline-safe note drafts
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── types/
│   │   ├── entities.ts                            # Tenant, Case, Appointment, Grievance, etc.
│   │   ├── roles.ts
│   │   └── api.ts
│   │
│   └── config/
│       ├── constants.ts
│       └── categories.ts                          # 6 consultant categories, extensible enum
│
├── public/
│   └── assets/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   │   └── rls-policies.test.ts                   # verifies tenant isolation + grievance exception
│   └── e2e/
│       └── booking-flow.spec.ts
│
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Notes on how this maps back to the docs

- **Route groups** (`(platform)`, `(auth)`, `(tenant)/[slug]/(public|admin|consultant|client)`) follow the routing convention stated in PRD §5 and Application Flow §20 exactly, so route-level access control lines up with the role matrix in PRD §1.4.
- **`middleware.ts`** is the single place subdomain resolution happens (Phase 0 in the PRD build plan) — it's kept top-level in `src/app` rather than nested, since Next.js requires it there.
- **`supabase/policies/`** is a physical mirror of schema §5 (RLS) — kept separate from `prisma/migrations` so the security review can happen independently of schema changes, and so `grievance` policies (§5.5–5.6, the deliberate Tenant-Admin exclusion) are easy to audit in isolation.
- **`lib/rag/`** enforces the "never left to prompt instructions" rule (PRD §1.2) at the code layer — `retrieval.ts` is the only place a Pinecone query is issued, and it requires both `tenantId` and `caseId`.
- **`lib/audit/log-access.ts`** backs both the Tenant Admin escalation path (schema §5.3) and the Super Admin cross-tenant bypass (schema §5.4) — one shared logging function, two callers.
- **`api/cron/`** holds the scheduled jobs implied by the PRD: end-of-day digest, `ConsultantAnalyticsSnapshot` aggregation, and the reminder/out-of-office-autoreply sweep.
- Build order should follow the PRD's Phase 0–11 sequence (foundation → platform console → onboarding → booking loop → session logging → commitments/tasks → growth/analytics → payments → AI → reviews/oversight → polish), since later phases assume earlier tables/RLS/route groups already exist.

Open items from the PRD (§6) — same-login for Tenant Admin/Consultant, cross-tenant Client identity, and the anonymized grievance-count view for Tenant Admins — are **not** reflected as separate routes/tables here, since they're still open questions; resolving them later would mean a schema migration (per schema §7) and a small set of new routes, not a restructuring of the tree above.
