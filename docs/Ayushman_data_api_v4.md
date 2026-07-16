# Ayushman — Data API Specification (Multi-Tenant Edition, Monorepo Stack)

**Version:** 3.2.0
**Service:** `apps/api` (Express), consumed by `apps/web` (Next.js 16) over HTTP only
**Auth provider:** Supabase Auth (JWT bearer tokens) for identity; role/tenant scoping resolved from the app's own `users` table — see §1.2
**Last updated:** July 2026

> Derived fresh from `PRD_v3_nextjs_express.md` (§1 Role & Tenancy, §4 Grievances, §5 Build Plan, §7 Tech Stack) and `schema_ayushman_v3.md` (§3 Tables, §4 RLS). Every endpoint below is tied to a specific table or table-cluster in the schema, and every access rule is tied to a specific line in the PRD's permission matrix (§1.4).
>
> **v3.1 change:** every endpoint now carries an explicit **Roles / Auth Header / Policy** block instead of leaving those implied by the general rules in §1. The general rules in §1 still apply globally — the per-endpoint blocks state how they resolve for that specific route (which role, which header requirement, which row-ownership/tenant check).
>
> **v3.2 change:** §1.1, §1.2, §1.8, §1.11, §2, §24, §25, and §26 are reconciled against the actual `apps/api`/`packages/db` implementation (not just the source docs) — tenant resolution, RLS enforcement status, base URL, and the payment provider all diverged from the original spec. A new **§28 API Folder Structure** maps the privilege matrix (PRD §1.4) onto the real `apps/api/src` layout.
>
> **One gap inherited from the source docs, not introduced here:** the PRD (§2 item 7, §5 Phase 4) requires a waitlist feature, but no `waitlist` table exists in the schema. §12 below is marked **PROVISIONAL — schema pending**. (The `payments` table gap noted in earlier versions of this doc no longer applies — see §24.)

---

## 1. Security Standards

These apply globally; §1.2's per-endpoint blocks state how each rule resolves for that specific route.

### 1.1 Authentication

- Every request (except `(public)` routes, explicitly marked) requires `Authorization: Bearer <supabase_access_token>`.
- `apps/api`'s `authMiddleware` (`apps/api/src/middleware/auth.ts`) verifies the token on **every** request via an `AuthVerifier` abstraction (`apps/api/src/lib/auth`) backed by Supabase — never cached, never trusted from a prior request.
- **Role and `tenantId` are not read from JWT custom claims.** The verified token only proves _identity_ (a `supabaseAuthUserId`). `authMiddleware` then looks up the matching `users` row by that id and attaches `role`/`tenantId`/`accountStatus` from **the app's own database**, not from the token payload. This is a deliberate divergence from the PRD's original "Postgres Auth Hook stamps `tenant_id`/`is_super_admin` onto the JWT" design (PRD §1.2/§7.3) — no Auth Hook is wired up; the `users` table is the single source of truth for role/tenant on every request.
- A request whose matching `users.accountStatus != ACTIVE` is rejected `401` regardless of token validity.
- Tokens are short-lived and rotated by Supabase Auth; `apps/api` never issues, stores, or refreshes a token and never touches password/OTP/refresh-token data.
- No endpoint accepts credentials in a query string; no log line ever contains a raw bearer token.

### 1.2 Tenant scoping — the real enforcement boundary

- After `authMiddleware` attaches `req.user.role`/`req.user.tenantId` (§1.1), `tenantContextMiddleware` (`apps/api/src/middleware/tenant-context.ts`) resolves and verifies the tenant for the request:
  1. **Candidate tenant slug** is resolved by `resolveTenantSlug()` — either an explicit `X-Tenant-Slug` header (used by `apps/web`'s server-side fetches, which don't preserve the browser's Host header) or the request's subdomain (`{slug}.<TENANT_ROOT_HOST>`). This resolved slug is **advisory only**, exactly like a `:tenantId` path param — never trusted on its own.
  2. If no slug resolves: allowed only for `SUPER_ADMIN` (acting platform-wide, `tenantContext.tenantId = null`); any other role gets `400 TENANT_REQUIRED`.
  3. If a slug resolves, the tenant is looked up; unknown slug → `404`; `status != ACTIVE` → `403 TENANT_SUSPENDED`.
  4. The resolved tenant's `id` is cross-checked against `req.user.tenantId` (from §1.1, i.e. the caller's own `users` row — not a JWT claim):
     - **Mismatch, non-`SUPER_ADMIN`** → `403 TENANT_MISMATCH`, nothing executes.
     - **Match, or caller is `SUPER_ADMIN`** → `req.tenantContext` is attached (`{ tenantId, isSuperAdmin, userId }`).
- `:tenantId` in a route path is checked _separately and afterward_ by `requireTenantMatch` middleware (`apps/api/src/middleware/require-tenant-match.ts`), which compares `req.params.tenantId` against the already-resolved `req.tenantContext.tenantId` — a `SUPER_ADMIN` always passes this check regardless of path value; anyone else gets `403 TENANT_MISMATCH` on any path/context disagreement.
- Every tenant-scoped query must run inside `withTenantContext()` (`packages/db/src/rls-context.ts`), which opens a DB transaction and issues `SET LOCAL app.tenant_id` / `app.is_super_admin` / `app.user_id` from `req.tenantContext` before any query runs — this is what Postgres RLS filters on (see the enforcement-status caveat in §1.11).
- Cross-tenant `SUPER_ADMIN` access still requires an `audit_logs` row (`is_cross_tenant_access = true`) per-route, as detailed in the endpoint blocks below and enforced in `apps/api/src/services/audit.service.ts`; a `reason` is required for anything beyond the tenant list/billing dashboard.
- A user can never override their tenant scope by editing the path, the `X-Tenant-Slug` header, or the subdomain — all three are advisory inputs cross-checked against `req.user.tenantId`, which itself comes from a DB row keyed off the verified token's `supabaseAuthUserId`, not from anything the caller supplies directly.

### 1.3 Authorization (role checks)

- A `require-role([...])` middleware runs after `tenant-context`, mirroring PRD §1.4 exactly.
- Row-ownership is checked in addition to role where relevant (e.g. `CONSULTANT` can only mutate a `case` where `consultant_id` matches their own profile).
- Private clinical/legal notes have **no standing `TENANT_ADMIN` route** — only the logged escalation path.
- Grievances have their own auth branch entirely outside the standard tenant policy — no `TENANT_ADMIN`/`CONSULTANT` route exists for that resource at all.

### 1.4 Input validation

Every body/query/param is validated against a `.strict()` Zod schema from `packages/types/api-contracts` before business logic runs; unknown fields are rejected, not stripped.

### 1.5 Rate limiting & abuse prevention

Global per-IP limit plus tighter per-route limits (grievance submission capped per Client/day; booking endpoints rate-limited per Client). Webhooks are exempt from bearer auth but must verify their own provider signature.

### 1.6 Data exposure minimization

List/detail endpoints filter `is_client_visible = false` rows out of any `CLIENT`-callable response at the query layer, not the render layer. Generic `500` bodies in production; full detail only in server-side logs.

### 1.7 Storage & file handling

No raw Storage credentials returned. Uploads/downloads go through `apps/api`-issued signed URLs scoped to `{tenantId}/{caseId}/...`, short-lived (5–15 min), type/size-validated server-side.

### 1.8 Payment & webhook integrity

Stripe webhooks verify the `Stripe-Signature` header against the raw request body (via the Stripe SDK's `constructEvent`) before processing. Checkout endpoints require an `Idempotency-Key`. No card data ever transits `apps/api` — Stripe Elements/Checkout handles card capture client-side; `apps/api` only ever sees a `PaymentIntent`/`Customer` id.

### 1.9 Audit logging

Every Super Admin cross-tenant read and every Tenant Admin escalated case view writes to `audit_logs` inside the same transaction as the read — never a separate, skippable step. `audit_logs` itself has no write route exposed to user input.

### 1.10 Transport & headers

HTTPS + HSTS only; standard security headers on every response; CORS allow-list limited to `apps/web`'s known origins, no wildcard origin.

### 1.11 RLS as defense-in-depth

Every table below (except `grievances`) carries the standard RLS policy (`tenant_id = current_setting('app.tenant_id')::uuid OR is_super_admin`), defined in `supabase/policies/*.sql` and set per-request via `withTenantContext()`'s `SET LOCAL` calls (§1.2). Application-layer checks exist so a bug in one layer alone can't cause a breach.

> **Known gap — RLS is code-complete but not yet live.** `supabase/roles/app-role.sql` documents that `apps/api`'s `DATABASE_URL` currently connects as the `postgres` role, which **owns** every table and therefore bypasses RLS unconditionally regardless of `SET LOCAL app.tenant_id`. The intended non-owner `app_user` role exists in that SQL file but the connection-string swap to use it is a manual deploy step not yet performed. Until that swap happens, tenant isolation is enforced **only** by the application-layer checks in §1.2 (`tenantContextMiddleware` + `requireTenantMatch`) — RLS is not currently a second line of defense in practice, only in code. Treat this as an open production-readiness item, not a resolved control.

---

## 2. API Conventions

| Aspect            | Convention                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL          | `https://api.ayushman.app/api` (no version segment — matches `apps/api/src/index.ts`'s actual mount points, e.g. `/api/tenants/:tenantId/cases`; not yet versioned)                                        |
| Content type      | `application/json` (except file uploads — signed-URL `PUT` direct to Storage)                                                                                                                              |
| Pagination        | Cursor-based: `?cursor=<opaque>&limit=<n, default 20, max 100>`                                                                                                                                            |
| Response envelope | `{ "data": ..., "meta": {...} }` (lists) / `{ "data": ... }` (single resource)                                                                                                                             |
| Error envelope    | `{ "error": { "code": "STRING_CODE", "message": "...", "correlationId": "uuid" } }`                                                                                                                        |
| Status codes      | `200/201/204` success · `400` validation · `401` missing/invalid token · `403` role/tenant failure · `404` not found · `409` conflict · `422` semantically invalid · `429` rate-limited · `500` unexpected |
| Idempotency       | `Idempotency-Key` header on all side-effecting `POST`s; required on payment routes                                                                                                                         |
| Soft delete       | Sets `deleted_at`/status; 30-day recovery window where noted                                                                                                                                               |
| Tenant resolution | `X-Tenant-Slug: <slug>` header (used by `apps/web`'s server-side fetches) or a `{slug}.<TENANT_ROOT_HOST>` request host — one of the two is required on every non-platform route; see §1.2                 |

### 2.1 Per-endpoint block — field legend

Every endpoint from §3 onward uses this block:

- **Roles:** which `user_role` value(s) may call this route, and any row-ownership qualifier (e.g. "own" = row's `consultant_id`/`client_id` must match the caller).
- **Auth Header:** the exact header requirement for this specific route (almost always `Authorization: Bearer <supabase_access_token>`; `(public)` routes state `None`; webhook routes state their signature header instead).
- **Policy:** the tenant/ownership/escalation rule enforced for this route specifically — how §1.2/§1.3 resolve here, plus any route-specific rule (rate limit, immutability, cascade behavior).
- **Description:** what the endpoint does.

---

## 3. Auth & Session

#### `GET /auth/me`

- **Roles:** any authenticated role
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Identity resolved entirely from the verified token — no `userId` accepted as input, so a caller can never request another user's profile through this route.
- **Description:** Returns the caller's `users` row plus role-specific profile (`client_profiles`/`consultant_profiles`, or nothing extra for `SUPER_ADMIN`/`TENANT_ADMIN`).

#### `POST /auth/register-profile`

- **Roles:** `CLIENT` (immediately post-signup, before a `client_profiles` row exists)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required — issued by Supabase Auth at signup, before business profile exists)
- **Policy:** `tenant_id` taken only from the JWT claim stamped at sign-in; cannot be supplied in the body.
- **Description:** Creates the `users` + `client_profiles` rows completing signup.

---

## 4. Platform Console — `tenants`, `tenant_billing` (Super Admin only, global scope)

#### `GET /platform/dashboard`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Global scope; no tenant-context middleware applies (there is no single tenant to scope to). Cross-tenant KPI aggregation is inherently a Super Admin-only read.
- **Description:** Active tenant count, MRR, bookings this week, transcription-queue health, flagged disputes.

#### `GET /platform/tenants`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Global list; no per-tenant filter applied by default (query params narrow it, they don't grant additional access).
- **Description:** List/search all tenants. Query: `status`, `planTier`, `search`.

#### `POST /platform/tenants`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Only a Super Admin token can create a tenant (PRD §1.4 — "Create/suspend a tenant" is Super-Admin-only, no exceptions).
- **Description:** Provisions `slug`, a default `TENANT_ADMIN` user + invite email, and a default `tenant_settings` row.

#### `GET /platform/tenants/:tenantId`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Reading a specific tenant's deep view (usage/billing/staff) is a cross-tenant read for the platform account — logged to `audit_logs` with `is_cross_tenant_access = true`.
- **Description:** Single-tenant deep view: usage stats, billing status, staff list.

#### `PATCH /platform/tenants/:tenantId`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Same cross-tenant audit rule as above; `reason` required in the body.
- **Description:** Updates branding/`themeConfig`/`planTier`.

#### `POST /platform/tenants/:tenantId/suspend`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Sets `status = SUSPENDED`; enforced at both `apps/web` middleware (UI block) and `apps/api`'s tenant-context check (hard block) — a suspended tenant's own tokens are refused going forward.
- **Description:** Suspends a tenant.

#### `POST /platform/tenants/:tenantId/reinstate`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Sets `status = ACTIVE`.
- **Description:** Reinstates a suspended tenant.

#### `DELETE /platform/tenants/:tenantId`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Never a hard delete — sets `status = ARCHIVED` per the indefinite-retention rule (schema §5).
- **Description:** Archives a tenant.

#### `POST /platform/tenants/:tenantId/escalate`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Body **must** include `{ "reason": string }` (non-empty) — request is rejected with `400` otherwise. Every subsequent read in this escalation session writes an `audit_logs` row.
- **Description:** Opens a logged, scoped cross-tenant data view.

#### `GET /platform/tenants/:tenantId/billing`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Cross-tenant read, audit-logged.
- **Description:** Reads `tenant_billing`.

#### `PATCH /platform/tenants/:tenantId/billing`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Cross-tenant write, audit-logged.
- **Description:** Updates `planName`/`mrr`/`status`/`platformCommissionPct`.

#### `GET /platform/settings`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Platform-wide, not tenant-scoped at all.
- **Description:** Supported categories, notification-provider keys (redacted), feature flags per plan tier.

#### `PATCH /platform/settings`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Platform-wide write.
- **Description:** Updates the above.

---

## 5. Tenant Settings & Billing (own tenant) — `tenant_settings`, `tenant_billing`

#### `GET /tenants/:tenantId/settings`

- **Roles:** `TENANT_ADMIN` (own tenant), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant-match rule (§1.2) — a `TENANT_ADMIN` token whose `tenant_id` claim doesn't match `:tenantId` gets `403`.
- **Description:** Reads `tenant_settings`.

#### `PATCH /tenants/:tenantId/settings`

- **Roles:** `TENANT_ADMIN` (own tenant), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant-match rule.
- **Description:** Updates `defaultCurrency`, `payoutCycle`, `bookingCutoffHours`, `autoApproveBookings`, `brandingColors`, `supportedLanguages`.

#### `GET /tenants/:tenantId/billing`

- **Roles:** `TENANT_ADMIN` (own tenant)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Response deliberately omits `mrr` (platform-internal figure) — only `planName`, `status`, `renewsAt` are returned to a Tenant Admin, even though the row itself has no field-level RLS (the projection is enforced in the service layer).
- **Description:** Tenant's own subscription view.

---

## 6. Users — `users`

#### `GET /tenants/:tenantId/users`

- **Roles:** `TENANT_ADMIN` (own tenant), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant-match rule (§1.2).
- **Description:** Lists users. Query: `role`, `accountStatus`, `search`.

#### `POST /tenants/:tenantId/users`

- **Roles:** `TENANT_ADMIN` (own tenant, `role=CONSULTANT` only), `SUPER_ADMIN` (any role)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Server-side check blocks a `TENANT_ADMIN` request body containing `role: TENANT_ADMIN` or `role: SUPER_ADMIN` — rejected `403` even though the tenant-match itself would pass. Prevents self-escalation.
- **Description:** Invites a user via Supabase Admin API + creates the `public.users` row.

#### `GET /tenants/:tenantId/users/:userId`

- **Roles:** `TENANT_ADMIN` (own tenant), `SUPER_ADMIN`, self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Tenant-match, or `userId == caller's own id`.
- **Description:** Single user detail.

#### `PATCH /tenants/:tenantId/users/:userId`

- **Roles:** `TENANT_ADMIN` (own tenant, non-admin roles only), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** A `TENANT_ADMIN` cannot target a `SUPER_ADMIN` or another `TENANT_ADMIN` row — checked against the target row's `role`, not just the tenant match.
- **Description:** Updates `accountStatus`, `phone`.

#### `DELETE /tenants/:tenantId/users/:userId`

- **Roles:** `TENANT_ADMIN` (own tenant, non-admin roles), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Soft-deactivate only (`accountStatus = DELETED`); PII cleared 30 days later by a background job, not this call.
- **Description:** Deactivates a user.

---

## 7. Clients — `client_profiles`, `client_category_profiles`, `guardian_links`

#### `GET /tenants/:tenantId/clients`

- **Roles:** `CONSULTANT` (own case-linked clients only), `TENANT_ADMIN` (own tenant, all clients)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** A `CONSULTANT` result set is additionally filtered to `client_profiles` linked via a `cases` row where `consultant_id` equals the caller's own profile — tenant match alone is not sufficient.
- **Description:** Query: `search`, `pinned`, `tag`.

#### `GET /tenants/:tenantId/clients/:clientId`

- **Roles:** `CONSULTANT` (own), `TENANT_ADMIN`, self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CONSULTANT` requires an existing `cases` row linking them to this client; `CLIENT` requires `clientId == caller's own profile id`.
- **Description:** Single client profile.

#### `PATCH /tenants/:tenantId/clients/:clientId`

- **Roles:** self (`CLIENT`), `TENANT_ADMIN` (support edits only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `dob`/`isMinor`-derived fields are immutable via this route once a `guardian_links` consent row exists — a later edit attempt is `422`.
- **Description:** Updates `fullName`, `preferredLanguage`, `timezone`, emergency contact.

#### `GET /tenants/:tenantId/clients/:clientId/category-profiles`

- **Roles:** `CONSULTANT` (own), `TENANT_ADMIN`, self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Same ownership rule as the parent client resource.
- **Description:** Category-specific intake data.

#### `PUT /tenants/:tenantId/clients/:clientId/category-profiles/:category`

- **Roles:** self (`CLIENT`), `CONSULTANT` (own, intake on behalf of client)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Upsert scoped to `(clientId, category)` unique constraint; a `CONSULTANT` must have an active `cases` row with this client in this `category`.
- **Description:** Upserts intake JSON.

#### `POST /tenants/:tenantId/clients/:clientId/guardians`

- **Roles:** self (adult `CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Caller must be the adult creating a _dependent_ profile — `clientId` in the path is the new dependent's profile, not the caller's own; ownership of the new row is established by this call itself (`guardian_user_id = caller`).
- **Description:** Creates a `guardian_links` row for a dependent/minor.

#### `GET /tenants/:tenantId/clients/:clientId/guardians`

- **Roles:** self, guardian, `CONSULTANT` (own), `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant + ownership match.
- **Description:** Lists guardian links for a client.

#### `POST /tenants/:tenantId/guardian-links/:linkId/consent`

- **Roles:** guardian (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Only the `guardian_user_id` on that specific `guardian_links` row may consent — checked against the caller's own user id, not just role.
- **Description:** Sets `consentGivenAt = now()`; bookings for the minor are blocked until this is set.

#### `DELETE /tenants/:tenantId/guardian-links/:linkId`

- **Roles:** guardian, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant + ownership match.
- **Description:** Removes a guardian link.

---

## 8. Consultants — `consultant_profiles`, `availability_slots`, `out_of_office_periods`, `consultant_verification_documents`

#### `GET /tenants/:tenantId/consultants`

- **Roles:** `TENANT_ADMIN` (own tenant), `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant-match.
- **Description:** Full CRUD list with booking/utilization stats.

#### `POST /tenants/:tenantId/consultants`

- **Roles:** `TENANT_ADMIN` (own tenant)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `invitedBy` is set server-side to the calling Tenant Admin's own `users.id` — never client-supplied.
- **Description:** Invites a Consultant: creates `users` (role=`CONSULTANT`) + `consultant_profiles`.

#### `GET /tenants/:tenantId/consultants/:consultantId`

- **Roles:** `TENANT_ADMIN`, `SUPER_ADMIN`, self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (role match or self match).
- **Description:** Admin-facing profile: license docs, "Accept Bookings" override, case count, dispute flags.

#### `PATCH /tenants/:tenantId/consultants/:consultantId`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Updates bio, fee, languages, `acceptingBookings` toggle.

#### `DELETE /tenants/:tenantId/consultants/:consultantId`

- **Roles:** `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Deactivates only; case history is never deleted.
- **Description:** Deactivates a consultant.

#### `GET /tenants/:tenantId/consultants/:consultantId/availability`

- **Roles:** self, `TENANT_ADMIN`, `(public)` — open-slot subset only
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (self/admin) — `None` for the `(public)` open-slots projection
- **Policy:** The `(public)` variant strips `status != OPEN` rows and any internal scheduling fields server-side before returning — never a client-side filter.
- **Description:** Query: `from`, `to`.

#### `POST /tenants/:tenantId/consultants/:consultantId/availability`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin); supports a bulk array body for "block this week."
- **Description:** Creates recurring weekly slot(s) or a date-override block.

#### `PATCH /tenants/:tenantId/availability-slots/:slotId`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Updates a slot.

#### `DELETE /tenants/:tenantId/availability-slots/:slotId`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Blocked with `409` if `status = BOOKED` unless `force=true` is passed alongside a cancellation flow — prevents accidentally orphaning a booked appointment.
- **Description:** Deletes/blocks a slot.

#### `GET /tenants/:tenantId/consultants/:consultantId/calendar-feed.ics`

- **Roles:** holder of a valid feed token (not role-gated in the normal sense)
- **Auth Header:** **None** — a per-consultant signed feed token is embedded in the URL itself (calendar apps can't send `Authorization` headers); the token is long-lived but independently revocable.
- **Policy:** Token is scoped read-only to that one consultant's own appointments; rotating it immediately invalidates any previously shared link. This route is deliberately outside the bearer-JWT model — treat the feed URL itself as the secret.
- **Description:** One-way outbound `.ics`/Google Calendar feed.

#### `GET /tenants/:tenantId/consultants/:consultantId/out-of-office`

- **Roles:** self, `TENANT_ADMIN`, `(public)` — existence + auto-reply message only
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (self/admin) — `None` for the public projection
- **Policy:** Public projection excludes internal scheduling fields.
- **Description:** Reads OOO periods.

#### `POST /tenants/:tenantId/consultants/:consultantId/out-of-office`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Pauses new bookings / triggers auto-reply for a date range.

#### `PATCH /tenants/:tenantId/out-of-office/:oooId` · `DELETE /tenants/:tenantId/out-of-office/:oooId`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Updates/removes an OOO period.

#### `GET /tenants/:tenantId/consultants/:consultantId/verification-documents`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** No platform approval workflow exists (schema §3.25) — this is a display-only read, never a moderation queue.
- **Description:** Lists uploaded verification docs.

#### `POST /tenants/:tenantId/consultants/:consultantId/verification-documents`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Returns a signed Storage upload URL scoped to `{tenantId}/{consultantId}/...`, valid 5–15 min; server-side file-type/size validation before the URL is issued.
- **Description:** Initiates a document upload.

#### `DELETE /tenants/:tenantId/verification-documents/:docId`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Removes a document.

---

## 9. Public Tenant Site (unauthenticated read-only booking surface)

#### `GET /tenants/:tenantId/public/profile`

- **Roles:** none — public
- **Auth Header:** None
- **Policy:** Returns `404` if `tenants.status != ACTIVE`; response is a hand-curated public projection (branding, consultant list, categories) — never the raw `tenants`/`consultant_profiles` rows.
- **Description:** Tenant landing page data.

#### `GET /tenants/:tenantId/public/consultants/:consultantId`

- **Roles:** none — public
- **Auth Header:** None
- **Policy:** Public projection only (bio, fee, languages, rating average) — no internal/admin fields.
- **Description:** Public consultant profile.

#### `GET /tenants/:tenantId/public/consultants/:consultantId/available-slots`

- **Roles:** none — public
- **Auth Header:** None
- **Policy:** Only `status = OPEN` slots, respecting `booking_cutoff_hours` and any active OOO block; internal slot metadata stripped.
- **Description:** Query: `from`, `to`.

---

## 10. Cases — `cases`

#### `GET /tenants/:tenantId/cases`

- **Roles:** `CONSULTANT` (own only), `TENANT_ADMIN` (metadata only, not notes)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CONSULTANT` result set filtered to `consultant_id = caller's own profile id`, in addition to tenant match. Query: `status`, `tag`, `search`, `pinned`.
- **Description:** Consultant's client list / Tenant Admin's tenant-wide case metadata.

#### `POST /tenants/:tenantId/cases`

- **Roles:** `CONSULTANT`, or system-created on first booking
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `consultant_id` on the new row is forced to the caller's own profile id when created by a `CONSULTANT` directly — cannot create a case on another consultant's behalf.
- **Description:** Creates a case; `matterKey` disambiguates concurrent cases for the same pair.

#### `GET /tenants/:tenantId/cases/:caseId`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`, shared-visibility fields only), `TENANT_ADMIN` (metadata only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** A `CLIENT` response strips any nested `interactions`/`documents` where `is_client_visible = false` at the query layer. A `TENANT_ADMIN` response excludes private note content entirely — that requires the separate `/escalate` route below.
- **Description:** Case detail.

#### `PATCH /tenants/:tenantId/cases/:caseId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row's `consultant_id` must equal the caller's own profile id.
- **Description:** Updates `tags[]`, `status`, `matterKey`.

#### `POST /tenants/:tenantId/cases/:caseId/escalate`

- **Roles:** `TENANT_ADMIN` (own tenant)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Body **must** include `{ "reason": string }` (non-empty), enforced at the API layer before the `tenant_admin_view_case()` `SECURITY DEFINER` function is called. This is the _only_ path a Tenant Admin ever sees private notes through — every call is unconditionally logged.
- **Description:** Logged escalated case view.

#### `GET /tenants/:tenantId/cases/:caseId/export`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `clientId` on the case must equal the caller's own profile id; shared-visibility items only.
- **Description:** Timeline/document export for data portability.

---

## 11. Appointments & Series — `appointment_series`, `appointments`

#### `GET /tenants/:tenantId/cases/:caseId/appointments`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the parent `case`'s `consultant_id`/`client_id`.
- **Description:** Lists appointments for a case.

#### `POST /tenants/:tenantId/cases/:caseId/appointments`

- **Roles:** self (`CLIENT`), `CONSULTANT` (own, ad-hoc)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Conflict-checked against `availability_slots`; `409` on double-book. Caller must be a party to the case (client or consultant).
- **Description:** Single-occurrence booking.

#### `POST /tenants/:tenantId/cases/:caseId/appointment-series`

- **Roles:** self (`CLIENT`), `CONSULTANT`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Same case-party check; creates `appointment_series` + expands `appointments` rows atomically in one transaction.
- **Description:** Recurring booking.

#### `GET /tenants/:tenantId/appointment-series/:seriesId`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the linked case.
- **Description:** Series detail.

#### `PATCH /tenants/:tenantId/appointment-series/:seriesId`

- **Roles:** `TENANT_ADMIN` (admin-approve/reschedule/reject the series' initial `REQUESTED` occurrences — the only role that can reject/cancel), `CONSULTANT` (own — accept an `ADMIN_APPROVED` series into `APPROVED`; no reject/cancel path, transfer the case to a peer consultant instead)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Cancelling cascades only to future `REQUESTED`/`ADMIN_APPROVED`/`APPROVED` occurrences — past/`COMPLETED` occurrences are untouched by this call. Follows the same two-stage `REQUESTED` → `ADMIN_APPROVED` → `APPROVED` gate as a single appointment (below), applied to the whole series in one action.
- **Description:** Admin-approves/Consultant-approves/cancels a whole series.

#### `GET /tenants/:tenantId/appointments/:appointmentId`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the linked case.
- **Description:** Appointment detail.

#### `PATCH /tenants/:tenantId/appointments/:appointmentId`

- **Roles:** `TENANT_ADMIN` (own tenant — admin-approve/propose-reschedule/reject a `REQUESTED` appointment, checking the Consultant's availability; the **only** role that can ever reject/cancel, at any stage), `CONSULTANT` (own — accept an `ADMIN_APPROVED` appointment into `APPROVED`, then complete/no-show/`videoLink` on it — no reject/cancel path; a Consultant who doesn't want it transfers the case to a peer consultant instead, via `POST /cases/:caseId/reassign`), self `CLIENT` (accept/decline a Tenant-Admin-proposed reschedule, cancel own booking within cutoff)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** State transitions validated against the `appointment_status` enum server-side — an illegal transition (e.g. `COMPLETED → REQUESTED`) is `422` regardless of role. Two-stage approval gate: a new booking starts `REQUESTED`; only the `TENANT_ADMIN` can move it to `ADMIN_APPROVED` (or `RESCHEDULE_PROPOSED`, or `CANCELLED` to reject); only then can the `CONSULTANT` accept it into `APPROVED` — a `CONSULTANT` cannot act on a `REQUESTED` appointment the Tenant Admin hasn't reviewed yet, cannot reject/cancel an `ADMIN_APPROVED` appointment (transferring the case to a peer consultant is the alternative), and a `TENANT_ADMIN` cannot skip straight to `APPROVED`. On `RESCHEDULE_PROPOSED`, the `CLIENT` accepts back into `ADMIN_APPROVED` (forwarded to the Consultant) or declines into `CANCELLED`. `autoApproveBookings` (tenant/consultant setting) still allows a booking to skip both review stages straight to `APPROVED`. A `CLIENT` cannot set `videoLink` or mark `NO_SHOW`.
- **Description:** Appointment state-machine transitions — `REQUESTED` → (`TENANT_ADMIN`) `ADMIN_APPROVED` | `RESCHEDULE_PROPOSED` | `CANCELLED` → (`CONSULTANT`) `APPROVED` | `CANCELLED` → `COMPLETED` | `CANCELLED` | `NO_SHOW`.

---

## 12. Waitlist — **PROVISIONAL, schema pending**

Proposed shape: `waitlist_entries(id, tenant_id, slot_id, client_id, status[WAITING|NOTIFIED|EXPIRED], created_at)`.

#### `POST /tenants/:tenantId/availability-slots/:slotId/waitlist`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** One active entry per `(client_id, slot_id)`.
- **Description:** Joins a full/cancelled slot's waitlist.

#### `GET /tenants/:tenantId/consultants/:consultantId/waitlist`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Waitlist queue for a consultant's slots.

#### `DELETE /tenants/:tenantId/waitlist/:entryId`

- **Roles:** self, `CONSULTANT`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership: entry's `client_id` matches caller, or caller is the slot's consultant.
- **Description:** Leaves/removes an entry.

---

## 13. Interactions — `interactions`

#### `GET /tenants/:tenantId/cases/:caseId/interactions`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`, `is_client_visible=true` only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CLIENT` query has `is_client_visible = true` injected server-side, not client-toggleable.
- **Description:** Cursor-paginated timeline feed. Query: `type`.

#### `POST /tenants/:tenantId/cases/:caseId/interactions`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case's `consultant_id`.
- **Description:** Creates a session note/ad-hoc note/call log/message log; `isClientVisible` set at creation; audio triggers an async Whisper job.

#### `GET /tenants/:tenantId/interactions/:interactionId`

- **Roles:** `CONSULTANT` (own), self (if visible)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Same visibility gate as the list route.
- **Description:** Single interaction detail.

#### `PATCH /tenants/:tenantId/interactions/:interactionId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Cannot flip `isClientVisible` from `true` back to `false` on a row a client has already been able to read — that edit is rejected `422`; append a new note instead.
- **Description:** Edits notes.

#### `DELETE /tenants/:tenantId/interactions/:interactionId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Soft-delete (`deleted_at`); recoverable 30 days.
- **Description:** Deletes an interaction.

---

## 14. Commitments & Tasks — `commitment_templates`, `commitments`, `tasks`, `task_reminders`

#### `GET /tenants/:tenantId/consultants/:consultantId/commitment-templates` · `POST /tenants/:tenantId/consultants/:consultantId/commitment-templates`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Per-consultant library — `consultant_id` forced to caller's own id.
- **Description:** Reusable commitment templates.

#### `PATCH /tenants/:tenantId/commitment-templates/:templateId` · `DELETE /tenants/:tenantId/commitment-templates/:templateId`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via `consultant_id`.
- **Description:** Edits/removes a template.

#### `GET /tenants/:tenantId/cases/:caseId/commitments`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case.
- **Description:** Lists commitments.

#### `POST /tenants/:tenantId/cases/:caseId/commitments`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Optional `templateId` must belong to the same caller.
- **Description:** Creates a commitment, optionally from a template.

#### `PATCH /tenants/:tenantId/commitments/:commitmentId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case.
- **Description:** Status transitions (`ACTIVE`/`COMPLETED`/`DISCONTINUED`).

#### `GET /tenants/:tenantId/cases/:caseId/tasks`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`, own assigned only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CLIENT` query additionally filtered to `assigned_to = 'CLIENT'`. Query: `assignedTo`, `status`.
- **Description:** Consultant's overdue dashboard / client's "my tasks" widget.

#### `POST /tenants/:tenantId/cases/:caseId/tasks`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case; optional `reminders[]` creates `task_reminders` rows.
- **Description:** Creates a task, `assignedTo: CLIENT|CONSULTANT`.

#### `PATCH /tenants/:tenantId/tasks/:taskId`

- **Roles:** `CONSULTANT` (own), self (`CLIENT` — may only set `status = COMPLETED` on a task where `assigned_to = 'CLIENT'` and it's their own case)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** A `CLIENT` request touching any field other than `status→COMPLETED`, or targeting a task not assigned to them, is `403`.
- **Description:** Updates/completes a task.

#### `DELETE /tenants/:tenantId/tasks/:taskId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case.
- **Description:** Deletes a task.

---

## 15. Documents — `documents`

#### `GET /tenants/:tenantId/cases/:caseId/documents`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`, visible only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CLIENT` query has `is_client_visible = true` injected server-side.
- **Description:** Lists documents incl. version chain.

#### `POST /tenants/:tenantId/cases/:caseId/documents`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`, own uploads)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Returns a signed upload URL scoped to `{tenantId}/{caseId}/...`; `isClientVisible` is set by the uploader at this step and is immutable after `confirm` (new versions only, never a retroactive flip).
- **Description:** Initiates a document upload (step 1 of 2).

#### `PATCH /tenants/:tenantId/documents/:documentId/confirm`

- **Roles:** same as the uploader of the pending row
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Confirms metadata only after the client-side `PUT` to Storage completes.
- **Description:** Step 2 of upload.

#### `GET /tenants/:tenantId/documents/:documentId/download-url`

- **Roles:** `CONSULTANT` (own), self (if visible)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Issues a short-lived signed URL — never a permanent public link.
- **Description:** Download link.

#### `POST /tenants/:tenantId/documents/:documentId/versions`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** References `previousVersionId`; the prior version row is never overwritten or deleted.
- **Description:** Creates a new document version.

#### `DELETE /tenants/:tenantId/documents/:documentId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Soft-delete, 30-day recovery.
- **Description:** Deletes a document.

---

## 16. AI Chat / RAG — `chat_messages`, `ai_summaries`, `rag_citations`

#### `GET /tenants/:tenantId/cases/:caseId/chat`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case.
- **Description:** Chat history.

#### `POST /tenants/:tenantId/cases/:caseId/chat`

- **Roles:** `CONSULTANT` (own), self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** The retrieval call is hard-scoped to `tenantId` + `caseId` in code (never a prompt instruction — PRD Edge Case #28), querying only the tenant's own Pinecone namespace. A `CLIENT` sender can never retrieve private-note content through this route — the retrieval filter additionally excludes `is_client_visible = false` sources for that role.
- **Description:** Sends a message; response includes `ragCitations[]`.

#### `POST /tenants/:tenantId/chat/:messageId/feedback`

- **Roles:** `CONSULTANT`, self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the parent case.
- **Description:** Thumbs up/down (`+1`/`-1`).

#### `POST /tenants/:tenantId/appointments/:appointmentId/generate-recap`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the appointment's case; `isClientVisible` defaults `false`.
- **Description:** One-click session recap generation.

#### `GET /tenants/:tenantId/cases/:caseId/ai-summaries`

- **Roles:** `CONSULTANT` (own, all), self (`CLIENT`, visible only)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CLIENT` query filtered to `is_client_visible = true`.
- **Description:** Lists AI summaries.

#### `PATCH /tenants/:tenantId/ai-summaries/:summaryId`

- **Roles:** `CONSULTANT` (own)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via the case.
- **Description:** Toggles `isClientVisible` to share a recap.

---

## 17. Reviews — `reviews`

#### `POST /tenants/:tenantId/appointments/:appointmentId/review`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** One per appointment — DB `UNIQUE` constraint surfaces as `409` on a duplicate attempt. Caller must be the appointment's `client_id`.
- **Description:** `rating` (1–5, required), `npsScore` (0–10, optional), `comment`. A DB trigger recomputes `consultant_profiles.rating_avg/rating_count`.

#### `GET /tenants/:tenantId/consultants/:consultantId/reviews`

- **Roles:** `(public)`, `TENANT_ADMIN`, self
- **Auth Header:** None (`(public)`) / `Authorization: Bearer <supabase_access_token>` (`TENANT_ADMIN`/self)
- **Policy:** Public view omits the reviewing client's identity beyond what the tenant chooses to display.
- **Description:** Consultant's reviews.

---

## 18. Grievances — `grievances` (its own auth model, schema §4.3)

**No `TENANT_ADMIN` or `CONSULTANT` route exists for this resource at all — this is deliberate (PRD §4.2), not an oversight.**

#### `POST /tenants/:tenantId/grievances`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `tenantId` stored for Super Admin filtering only — never an access grant to that tenant's own staff. Rate-limited per Client per day (§1.5); repeated submissions are surfaced to Super Admin as a pattern, never auto-blocked.
- **Description:** Submits a grievance; notifies `SUPER_ADMIN` (in-app + email, SMS if flagged critical).

#### `GET /tenants/:tenantId/grievances/mine`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Query hard-filtered to `client_id = caller's own profile id` — never another client's submissions, and never visible to that tenant's `TENANT_ADMIN`/`CONSULTANT` regardless of role.
- **Description:** The client's own submissions + status.

#### `GET /platform/grievances`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Global inbox, no tenant filter required to view — this is the one resource where a Super Admin's cross-tenant read is the _normal_ access pattern, not an escalation (no `reason` required here, unlike §4/§10).
- **Description:** Query: `tenantId`, `category`, `severity`, `status`.

#### `GET /platform/grievances/:grievanceId`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Linked `caseId` (if any) is only readable inline if the Super Admin has gone through the standard case-escalation logging path — not exposed by default just because the grievance references it.
- **Description:** Full grievance detail incl. attachments.

#### `PATCH /platform/grievances/:grievanceId`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Any `status` change fires `GRIEVANCE_STATUS_CHANGED` to the submitting Client only — never to the tenant.
- **Description:** Assign/severity/status/resolution notes.

---

## 19. Analytics — `consultant_analytics_snapshot` (read-only; written only by cron)

#### `GET /tenants/:tenantId/consultants/:consultantId/analytics/burnout`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Latest `bookedHours`/`overdueCommitmentCount`.

#### `GET /tenants/:tenantId/consultants/:consultantId/analytics/slot-suggestions`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership only — not shared with `TENANT_ADMIN` (this is the consultant's own scheduling insight).
- **Description:** Historical cancellation-rate-by-hour.

#### `GET /tenants/:tenantId/consultants/:consultantId/analytics/summary`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin). Query: `from`, `to`.
- **Description:** Repeat-booking rate, average fee realized, busiest-hours heatmap.

---

## 20. Referrals — `referrals`, `consultant_referrals`

#### `GET /tenants/:tenantId/clients/:clientId/referral-code`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `clientId` must equal caller's own profile id.
- **Description:** The client's own referral code.

#### `POST /tenants/:tenantId/consultants/:consultantId/referrals`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `referringClientId` forced to caller's own id.
- **Description:** Creates a referral record on invitee signup.

#### `GET /tenants/:tenantId/consultants/:consultantId/referrals`

- **Roles:** self (`CLIENT`, own only), `CONSULTANT` (program-wide), `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `CLIENT` query filtered to `referring_client_id = caller's own id`.
- **Description:** Referral status/reward view.

#### `PATCH /tenants/:tenantId/referrals/:referralId/grant-reward`

- **Roles:** `CONSULTANT`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via `consultant_id`.
- **Description:** Sets `rewardStatus = GRANTED`.

#### `GET /tenants/:tenantId/consultants/:consultantId/consultant-referrals`

- **Roles:** self (both `from`/`to` inboxes)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via `from_consultant_id` or `to_consultant_id` matching caller.
- **Description:** Incoming/outgoing cross-consultant referral queue.

#### `POST /tenants/:tenantId/cases/:caseId/consultant-referrals`

- **Roles:** `CONSULTANT` (own case)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Same-tenant only; `from_consultant_id ≠ to_consultant_id` enforced by a DB constraint. `contextNote` is a carried-over summary — never raw private notes unless the referring Consultant explicitly copies them into the note text (no automatic inclusion of `interactions.notes`).
- **Description:** "Refer to colleague."

#### `PATCH /tenants/:tenantId/consultant-referrals/:referralId`

- **Roles:** receiving `CONSULTANT`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Only `to_consultant_id == caller` may accept/decline. Accepting auto-creates a new `cases` row seeded with `contextNote`.
- **Description:** Accept/decline a referral.

---

## 21. Notifications — `notifications`, `notification_preferences`

#### `GET /tenants/:tenantId/notifications`

- **Roles:** self (any role)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Hard-filtered to `user_id = caller's own id` — no role can view another user's notifications, including `SUPER_ADMIN`/`TENANT_ADMIN`.
- **Description:** Query: `unreadOnly`.

#### `PATCH /tenants/:tenantId/notifications/:notificationId/read`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via `user_id`.
- **Description:** Marks a notification read.

#### `GET /tenants/:tenantId/notification-preferences` · `PUT /tenants/:tenantId/notification-preferences`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Every write is scoped to `req.user.id` server-side — a user can never set another user's preferences, even a `TENANT_ADMIN` for their own staff.
- **Description:** Channel/lead-time/enabled config per notification `type`.

---

## 22. Audit Log — `audit_logs` (read-only; no write route under any role)

#### `GET /tenants/:tenantId/audit-log`

- **Roles:** `TENANT_ADMIN` (own tenant)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Scoped to that tenant's own escalation history only (`is_cross_tenant_access` rows about _other_ tenants are never returned here, even if this tenant happens to be the audited one in a Super Admin log — that view is platform-only).
- **Description:** Own-tenant escalation history.

#### `GET /platform/audit-log`

- **Roles:** `SUPER_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Global, filterable. Query: `tenantId`, `actorUserId`, `isCrossTenantAccess`, date range.
- **Description:** Global audit trail.

---

## 23. Push Subscriptions — `push_subscriptions`

#### `POST /tenants/:tenantId/push-subscriptions`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `user_id` forced to caller's own id.
- **Description:** Registers a Web Push endpoint (`{p256dh, auth}` keys).

#### `DELETE /tenants/:tenantId/push-subscriptions/:subscriptionId`

- **Roles:** self
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Row-ownership via `user_id`; also auto-pruned server-side on a `410 Gone` from the push service without any user request.
- **Description:** Removes a subscription.

---

## 24. Payments — `payments`

Actual schema (`packages/db/prisma/schema.prisma`, `model Payment` → `@@map("payments")`): `id`, `tenantId`, `appointmentId`, `clientId`, `stripePaymentIntentId` (unique), `stripeCustomerId` (nullable), `amount` (`Decimal(10,2)`), `currency` (default `INR`), `status` (`PaymentStatus`: `REQUIRES_PAYMENT_METHOD` default, plus the Stripe PaymentIntent lifecycle states), `createdAt`, `updatedAt`. This table is fully migrated — it is **not** schema-pending (earlier versions of this doc incorrectly listed `payments` as provisional). No `payments` router exists yet under `apps/api/src/routes`; the endpoints below are the target shape, not yet implemented.

#### `POST /tenants/:tenantId/appointments/:appointmentId/checkout`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required) **+ `Idempotency-Key` (required)**
- **Policy:** Caller must be the appointment's `client_id`. Can cover a whole series upfront or a single occurrence, per the Consultant's configured policy.
- **Description:** Creates a Stripe `PaymentIntent` (and a `Customer` on first use) scoped to this tenant/appointment; returns the client secret for Stripe Elements/Checkout to confirm.

#### `POST /webhooks/stripe`

- **Roles:** none — provider callback, not a user-facing role
- **Auth Header:** None — verified instead via the `Stripe-Signature` header against the raw request body and the webhook signing secret (Stripe SDK's `constructEvent`); unsigned/mismatched requests are `400` and never processed
- **Policy:** Signature verification is mandatory and happens before any DB write.
- **Description:** Handles `payment_intent.succeeded`/`payment_intent.payment_failed`/`charge.refunded`, updating `payments.status` accordingly.

#### `GET /tenants/:tenantId/clients/:clientId/payments`

- **Roles:** self (`CLIENT`)
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `clientId` must equal caller's own id.
- **Description:** Payment history, receipts/invoices.

#### `GET /tenants/:tenantId/consultants/:consultantId/payouts`

- **Roles:** self, `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** Standard tenant match + (self or admin).
- **Description:** Gross fee minus platform commission.

#### `POST /tenants/:tenantId/payments/:paymentId/refund`

- **Roles:** `TENANT_ADMIN`
- **Auth Header:** `Authorization: Bearer <supabase_access_token>` (required)
- **Policy:** `reason` required in the body, feeding the dispute record (PRD FR36).
- **Description:** Issues a Stripe refund (`refunds.create` against the PaymentIntent) via dispute mediation.

---

## 25. Webhooks (internal — provider-signature verified, not bearer-auth)

#### `POST /webhooks/stripe`

See §24.

#### `POST /webhooks/transcription`

- **Roles:** none — provider callback
- **Auth Header:** None — verified via a shared secret header specific to the Whisper integration, not a public unauthenticated surface
- **Policy:** Rejects any request that fails the shared-secret check before touching `interactions`.
- **Description:** Updates `interactions.transcriptionStatus` (`PROCESSING → COMPLETE|FAILED`) and attaches the resulting transcript.

---

## 26. Summary — Endpoint Count by Resource

| Resource group           | Endpoints | Schema ref                        |
| ------------------------ | --------- | --------------------------------- |
| Auth/session             | 2         | Supabase `auth.*` (out of schema) |
| Platform console         | 13        | §3.1–3.3                          |
| Tenant settings/billing  | 3         | §3.2–3.3                          |
| Users                    | 5         | §3.4                              |
| Clients                  | 9         | §3.5–3.7                          |
| Consultants              | 15        | §3.8–3.10, 3.25                   |
| Public tenant site       | 3         | read-only projection              |
| Cases                    | 5         | §3.11                             |
| Appointments/series      | 7         | §3.12                             |
| Waitlist _(provisional)_ | 3         | not yet in §3                     |
| Interactions             | 5         | §3.13                             |
| Commitments/tasks        | 9         | §3.14–3.15                        |
| Documents                | 6         | §3.16                             |
| AI/RAG                   | 6         | §3.17                             |
| Reviews                  | 2         | §3.18                             |
| Grievances               | 5         | §3.19                             |
| Analytics                | 3         | §3.20                             |
| Referrals                | 7         | §3.21                             |
| Notifications            | 4         | §3.22                             |
| Audit log                | 2         | §3.23                             |
| Push subscriptions       | 2         | §3.24                             |
| Payments                 | 5         | §24 (schema live, router pending) |
| Webhooks                 | 2         | n/a                               |
| **Total**                | **~113**  |                                   |

---

## 27. Open Items Carried Forward (not introduced here)

1. **Waitlist** — required by PRD §2 item 7, no backing table in the schema at all. §12 above is provisional pending a schema migration.
2. **RLS not yet live** — policies are defined and applied via `SET LOCAL`, but `apps/api` currently connects as the table-owning `postgres` role and bypasses them entirely; see the caveat in §1.11.
3. **Payments/Grievances/Reviews/Notifications/Documents/Interactions/Commitments-Tasks/AI-RAG/Analytics/Referrals/Public-tenant-site routers** — all have complete schema support (§24 payments included) but no router yet exists under `apps/api/src/routes/`; only auth/me, tenants, users, clients, consultants (+ availability/OOO), cases, and appointments (+ series) are implemented today. See §28 for the current routes inventory.
4. **Auth Hook not wired up** — the PRD's original design (Postgres Auth Hook stamping `tenant_id`/`is_super_admin` onto the JWT) was not implemented; role/tenant are resolved from the `users` table per-request instead (§1.1). Decide whether to build the Auth Hook to match the PRD, or update the PRD to match this simpler DB-lookup approach.

---

## 28. API Folder Structure — `apps/api/src`

Current tree (all paths relative to `apps/api/src/`); this is the actual layout, not a proposal:

```
apps/api/src/
├── index.ts                        # Express app: middleware chain + route mounting (see below)
├── lib/
│   ├── auth/
│   │   ├── index.ts                 # exports the active AuthVerifier implementation
│   │   ├── supabase-verifier.ts     # AuthVerifier backed by supabase-js auth.getUser()
│   │   └── types.ts                 # AuthVerifier / VerifiedIdentity interfaces
│   ├── callerProfile.ts             # resolves a caller's own ConsultantProfile/ClientProfile id (self-vs-admin checks)
│   ├── supabaseAdmin.ts             # Supabase service-role client (admin ops: user invites, storage)
│   └── tenant/
│       ├── getTenant.ts             # tenant row lookup by slug (bypasses RLS via withTenantContext super-admin ctx)
│       └── resolveTenantSlug.ts     # X-Tenant-Slug header / subdomain -> candidate slug (§1.2)
├── middleware/
│   ├── auth.ts                      # authMiddleware — verifies token, attaches req.user {id, role, tenantId, ...} (§1.1)
│   ├── tenant-context.ts            # tenantContextMiddleware — resolves + verifies tenant, attaches req.tenantContext (§1.2)
│   ├── require-tenant-match.ts      # requireTenantMatch — checks :tenantId path param against req.tenantContext
│   ├── require-role.ts              # requireRole(...roles) — role-gate factory mirroring PRD §1.4
│   └── errorHandler.ts              # AppError -> { error: { code, message, correlationId } } envelope (§2)
├── routes/
│   ├── me.ts                        # GET /auth/me (§3) — mounted ahead of tenantContextMiddleware, identity-only
│   ├── tenants.router.ts            # platformTenantsRouter (§4) + tenantSettingsRouter (§5)
│   ├── users.router.ts              # usersRouter (§6)
│   ├── clients.router.ts            # clientsRouter + guardianLinksRouter (§7)
│   ├── consultants.router.ts        # consultantsRouter + availabilitySlotsRouter + outOfOfficeRouter (§8)
│   ├── cases.router.ts              # casesRouter (§10)
│   └── appointments.router.ts       # caseAppointmentsRouter + caseAppointmentSeriesRouter + appointmentSeriesRouter + appointmentsRouter (§11)
└── services/
    ├── audit.service.ts             # writes audit_logs rows for cross-tenant/escalated reads (§1.2, §1.9)
    ├── booking.service.ts           # slot conflict-checking / appointment state transitions (§11)
    └── cases.service.ts             # case row-ownership helpers (§10)
```

No `controllers/` layer exists — request handling lives directly in each `*.router.ts` file, calling into `services/` for shared business logic and `lib/` for cross-cutting concerns (auth, tenant resolution, RLS-scoped DB access via `@ayushman/db`).

**Resources with a schema but no router yet** (§27 item 3): `grievances`, `payments`, `reviews`, `notifications` + `notification_preferences`, `documents`, `interactions`, `commitment_templates`/`commitments`, `tasks`/`task_reminders`, `chat_messages`/`ai_summaries`/`rag_citations`, `consultant_analytics_snapshot`, `referrals`/`consultant_referrals`, `push_subscriptions`, `audit_logs` (read route), and the unauthenticated public tenant site (§9). Each would follow the same `*.router.ts` + `*.service.ts` pattern as the resources above.

### 28.1 Privilege matrix (PRD §1.4) → where it's enforced

The four-role model (`SUPER_ADMIN` / `TENANT_ADMIN` / `CONSULTANT` / `CLIENT`) is enforced across three layers, none of which alone is sufficient:

| Layer                                                       | File(s)                                                                                                 | What it enforces                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**                                                | `middleware/auth.ts`                                                                                    | Who the caller is (`req.user.id`/`role`/`tenantId`), sourced from the `users` table keyed by the verified token — not the token payload itself (§1.1).                                                                                                                    |
| **Tenant scope**                                            | `middleware/tenant-context.ts`, `middleware/require-tenant-match.ts`                                    | Which tenant's data the request may touch; blocks cross-tenant access for every role except `SUPER_ADMIN` (§1.2).                                                                                                                                                         |
| **Role gate**                                               | `middleware/require-role.ts`, applied per-route in each `routes/*.router.ts`                            | Which roles may call a given route at all — e.g. `POST /tenants/:tenantId/consultants` is `requireRole("TENANT_ADMIN", "SUPER_ADMIN")` per PRD §1.4's "Invite/remove Consultants" row.                                                                                    |
| **Row ownership**                                           | Inline in each router (via `lib/callerProfile.ts` self-vs-admin helpers) and in `services/*.service.ts` | The matrix's row-level qualifiers that a role check alone can't express — e.g. `CONSULTANT` may only touch a `case` where `consultant_id` matches their own profile ("own clients" in PRD §1.4), checked in `cases.router.ts`/`cases.service.ts`, not just gated by role. |
| **RLS (defense-in-depth, not currently enforcing — §1.11)** | `supabase/policies/*.sql`, applied via `packages/db/src/rls-context.ts`'s `withTenantContext()`         | The same tenant/role rules re-expressed as Postgres policies, intended as a second line of defense if an application-layer check is ever missed. Currently bypassed in practice because `apps/api` connects as the `postgres` table-owning role — see §1.11.              |

Rows of the PRD §1.4 matrix with no standing route at all (by design, not an omission) are called out explicitly where they apply: private clinical/legal notes have no `TENANT_ADMIN` route except the logged `/cases/:caseId/escalate` path (§10), and grievances have no `TENANT_ADMIN`/`CONSULTANT` route of any kind (§18, §1.3, §4.2 of the PRD).
