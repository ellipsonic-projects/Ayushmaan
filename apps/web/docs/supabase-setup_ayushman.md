# Supabase Setup Notes

## Environment

Set these variables in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_PUBLIC_BUCKET=ayushman-public
SUPABASE_STORAGE_PRIVATE_BUCKET=ayushman-private
```

`SUPABASE_SERVICE_ROLE_KEY` is required server-side for the Whisper transcription
worker and any admin/dispute-escalation tooling — those flows write on behalf of
a user or bypass RLS entirely (e.g. writing `transcriptText` back onto an
Interaction the worker itself doesn't "own"). Never expose this key to the client.

## Auth Redirect URLs

Add these URLs in Supabase Auth → URL Configuration:

```text
http://localhost:3000/api/auth/social/callback
https://your-production-domain/api/auth/social/callback
http://localhost:3000/api/auth/otp/callback
https://your-production-domain/api/auth/otp/callback
http://localhost:3000/api/auth/reset-password
https://your-production-domain/api/auth/reset-password
http://localhost:3000/api/client/docs
https://your-production-domain/api/client/docs
```

FR1 requires email/phone + OTP as a signup path, and Supabase Auth also needs a
handler for password-reset links (used at minimum by Admin accounts even if
consultants/clients only ever use OTP) — the original notes only covered the
social login callback.

If email confirmation is enabled, make sure Site URL points at the correct web
origin, since confirmation links redirect there by default.

## Auth ↔ App User Sync

Prisma's `users` table has its own `id` used as the FK everywhere in the schema
(ClientProfile, ConsultantProfile, Case, etc.), plus a `supabase_auth_user_id`
column pointing back to `auth.users.id`. Every RLS policy below depends on being
able to go from `auth.uid()` → `public.users.id`. Two ways to keep that column
populated; pick one and document the choice:

- **App-managed (recommended given Prisma-first schema):** your signup API route
  creates the `public.users` row itself right after `supabase.auth.signUp()`
  succeeds, setting `supabase_auth_user_id = auth user's id`. Simple, keeps all
  writes going through Prisma, no DB triggers to keep in sync with migrations.
- **DB trigger:** an `on auth.users insert` trigger that inserts into
  `public.users`. Keeps things consistent even if a user is created outside your
  API, but now logic lives in both Prisma migrations and raw SQL — easy for the
  two to drift. Avoid unless you have a real reason to create `auth.users` rows
  outside your own signup flow.

Either way, add this helper — every policy below uses it instead of repeating
the subquery:

```sql
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where supabase_auth_user_id = auth.uid()
$$;
```

## Storage Buckets

Create two buckets:

1. `ayushman-public` — profile photos, consultant bio images.
2. `ayushman-private` — Interaction audio, Documents, license/qualification
   proofs.

Make `ayushman-public` public. Keep `ayushman-private` private.

Set restrictions at bucket-creation time rather than only enforcing them in app
code (edge case: malicious/oversized uploads):

```sql
update storage.buckets
set file_size_limit = 26214400, -- 25MB, raise for long audio if needed
    allowed_mime_types = array[
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'audio/webm', 'audio/mpeg', 'audio/wav',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'ayushman-private';
```

A size/mime allow-list only stops the obvious cases — it is not a malware scan.
FR/edge-case #23 also expects a scan step before a file is marked accessible to
anyone but the uploader; that has to happen out-of-band (e.g. a webhook or
background job hitting a scanning service, flipping `Document.scanStatus` from
`PENDING` to `CLEAN`/`INFECTED`). Gate the client-facing read at the application
query layer on `scanStatus = 'CLEAN'`, since Storage RLS can't see your
Prisma-managed `Document` row.

## Storage Path Convention

The original `<auth.uid()>/<folder>/<filename>` convention works for
single-owner files (profile photos) but breaks for anything Case-scoped: a
Document or Interaction audio file needs to be readable by *both* the
consultant and the client on that Case (subject to `visibility`/`accessLevel`),
not just by whoever uploaded it. Use:

```text
<caseId>/<category>/<filename>
```

- `ayushman-public/<userId>/avatar/<filename>` — profile photos stay
  owner-keyed, this one's fine as-is.
- `ayushman-private/<caseId>/interactions/<filename>` — audio recordings.
- `ayushman-private/<caseId>/documents/<filename>` — uploaded documents.
- `ayushman-private/consultant-verification/<consultantUserId>/<filename>` —
  license/qualification docs; kept out of the `<caseId>/...` tree entirely since
  they belong to onboarding, not a Case, and need Admin (not client) visibility.

## Storage Policies

Case-membership check, reused by both storage and table policies:

```sql
create or replace function public.is_case_participant(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id
      and (c.client_id = public.current_app_user_id()
           or c.consultant_id = public.current_app_user_id())
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = public.current_app_user_id() and role = 'ADMIN'
  )
$$;
```

Public bucket — avatars, owner-keyed as before:

```sql
create policy "users manage own avatar"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'ayushman-public'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'ayushman-public'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Private bucket — case-scoped documents and audio. Insert is left permissive and
gated by `is_case_participant`, so role-specific rules (e.g. only the
consultant on a Case uploads audio) should still be enforced in the app layer:

```sql
create policy "case participants can upload case files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ayushman-private'
  and (storage.foldername(name))[1] <> 'consultant-verification'
  and public.is_case_participant(((storage.foldername(name))[1])::uuid)
);

create policy "case participants can view case files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ayushman-private'
  and (storage.foldername(name))[1] <> 'consultant-verification'
  and public.is_case_participant(((storage.foldername(name))[1])::uuid)
);
```

No `delete` policy for `authenticated` — Commitments/Tasks/Documents call for
soft-delete with a recovery window (edge cases #16, #24), so hard deletes should
only happen via a service-role-driven cleanup job, not directly from the client.

Consultant verification docs — uploader (during onboarding) and Admin only,
never the client:

```sql
create policy "consultant uploads own verification docs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ayushman-private'
  and (storage.foldername(name))[1] = 'consultant-verification'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "consultant and admin view verification docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ayushman-private'
  and (storage.foldername(name))[1] = 'consultant-verification'
  and ((storage.foldername(name))[2] = auth.uid()::text or public.is_admin())
);
```

Note: Admin access here is intentionally narrow — verification docs only, not
every private file. FR36/edge case #41 require Case content (clinical/legal
notes) to stay out of Admin's reach unless a dispute is escalated and logged in
`AuditLog`; don't extend `is_admin()` into the general case-files policies
above. Handle escalated dispute access as a separate, explicitly logged path
(e.g. a service-role query from an admin-only API route that writes an
`AuditLog` row before returning the file), not a blanket RLS policy.

If you later enable upserts for Storage, add matching `update` policies
mirroring the `select` policies above.

## Database Row-Level Security

Storage policies only protect the files themselves; the PRD's data-isolation
requirement (§8 NFR, FR35) is about the Postgres rows — Cases, Interactions,
Commitments, Tasks, Documents, ChatMessages, etc. Prisma migrations don't enable
RLS on their own, so this needs to be a maintained SQL file run after every
`prisma migrate deploy`, not a one-time step.

```sql
alter table public.cases enable row level security;
alter table public.interactions enable row level security;
alter table public.commitments enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.chat_messages enable row level security;
-- repeat for every table holding Case-scoped or user-scoped data
```

Illustrative pattern (repeat per table, swapping the FK column):

```sql
create policy "participants can read case documents"
on public.documents
for select
to authenticated
using (public.is_case_participant(case_id));

create policy "participants can write case documents"
on public.documents
for insert
to authenticated
with check (public.is_case_participant(case_id));
```

`ChatMessage`/RAG retrieval deserves extra care: FR23/edge case #28 explicitly
call out that scoping must happen at the query layer via a hard `caseId` filter,
not prompt-level instruction alone. The RLS policy above is that DB-level
backstop — even if the retrieval code has a bug, Postgres still won't return
rows for a Case the requesting user isn't part of.

`Interaction.notesText`/`transcriptText` marked `visibility = CONSULTANT_ONLY`
and `Document.accessLevel = PRIVATE_TO_CONSULTANT` need an extra predicate on
top of `is_case_participant` — a client-role user should only see those rows
when the flag is set to shared:

```sql
create policy "clients see only shared documents"
on public.documents
for select
to authenticated
using (
  public.is_case_participant(case_id)
  and (
    exists (select 1 from public.users u where u.id = public.current_app_user_id() and u.role = 'CONSULTANT')
    or access_level = 'SHARED_WITH_CLIENT'
  )
);
```

Org Admin: give read access to non-sensitive operational tables (e.g.
appointments for dispute triage) directly via `is_admin()` in policies; for
Case content specifically, prefer routing through a service-role org API that
writes to `AuditLog` on every access, per edge case #41, rather than a standing
RLS bypass. There is no platform verification queue.

## Application API Routes — Consultant Access to Client Docs & Communication

RLS on `storage.objects` and the `public.documents`/`public.interactions` tables
means a consultant's Supabase client *can* read case files directly once
`is_case_participant()` passes. Route everything through app API routes anyway
rather than relying on direct client-side Supabase calls — RLS is the backstop,
not the interface — since you need to join Storage objects with their Prisma
metadata (category, version, scanStatus, visibility), generate short-lived
signed URLs instead of exposing bucket paths to the browser, and, for
Admin/dispute paths, write an `AuditLog` row on every access (edge case #41).

**Reading client-side supporting material (consultant only, own Cases only):**

```text
GET  /api/consultants/cases/:caseId/documents
     → list Documents for the case (metadata from Prisma), consultant sees
       both PRIVATE_TO_CONSULTANT and SHARED_WITH_CLIENT; excludes anything
       with scanStatus != 'CLEAN'

GET  /api/consultants/cases/:caseId/documents/:documentId/signed-url
     → service-role call to storage.createSignedUrl(), short TTL (e.g. 5 min);
       never return the raw bucket path to the client

GET  /api/consultants/cases/:caseId/interactions
     → notes/transcripts/audio signed URLs for the case, newest first

GET  /api/consultants/cases/:caseId/timeline
     → merged Appointments + Interactions + Commitments + Tasks + Documents,
       backing FR21/FR22 (filterable, paginated per NFR performance note)
```

Every route above must resolve `caseId → is_case_participant(caseId)` server-side
using the requesting consultant's session before touching storage or Prisma —
don't trust a `caseId` param without that check, since it's the same isolation
guarantee FR35 requires at the DB layer, just re-asserted at the route layer in
case a query ever runs under the service role.

**Client profile / "important details" (conditional per FR4):**

```text
GET  /api/consultants/cases/:caseId/client-profile
     → returns ClientProfile fields relevant to the consultant's category only
       (e.g. medical-history fields for a Medical consultant, omitted entirely
       for Astrology) rather than the full ClientProfile row
```

**Communication (FR29/FR30, edge case #20 — notification fallback):**

```text
POST /api/cases/:caseId/commitments          → log a Commitment (FR17)
POST /api/cases/:caseId/tasks                → assign a Task to client (FR18)
POST /api/cases/:caseId/documents/:id/share  → flip accessLevel to
                                                SHARED_WITH_CLIENT, explicit
                                                confirm step per edge case #25
POST /api/notifications/dispatch             → fan out a Task/Commitment/
                                                Document-shared event across
                                                the client's enabled channels
                                                (in-app/email/SMS/WhatsApp via
                                                Twilio), reading channel prefs
                                                off Notification + user prefs
```

`/api/notifications/dispatch` is where the SMS/WhatsApp fallback in edge case
#20 actually lives — older Astrology/Homeopathy clients who won't log in still
need to hear "task assigned, due Friday" some other way. Store phone number and
per-channel opt-in on `ClientProfile`/`User`, not just email, and don't let a
consultant pull that phone number directly from a generic "get client" route —
scope contact-info reads to the same `is_case_participant` route guard as
everything else, since a client's phone number is exactly the kind of thing
FR35's "no cross-tenant visibility" is meant to protect.

**Admin dispute access — separate, audited path, not a variant of the routes above:**

```text
GET  /api/admin/cases/:caseId/documents      → service-role read, requires
                                                is_admin() AND an open dispute
                                                reference; writes AuditLog
                                                {actorUserId, action: 'VIEW',
                                                 entityType: 'Case', entityId,
                                                 accessJustification: 'Dispute triage: ' + disputeId,
                                                 metadata: {disputeId}} before
                                                returning any signed URL
```

Keep this as its own route rather than an `?asAdmin=true` flag on the consultant
routes — makes it much harder to accidentally ship a path where Admin gets Case
content without the audit write happening first.

## Prisma Migration

Apply the Prisma migration that adds `users.supabase_auth_user_id` before
deploying, then (re)apply the RLS/policy SQL above — keep it in a checked-in
`supabase/policies.sql` (or Supabase migration folder) run immediately after,
since `prisma migrate deploy` will not preserve or reapply RLS state on its own:

```bash
npm prisma migrate deploy
psql "$DATABASE_URL" -f supabase/policies.sql
```
