# Multi-Tenant Application Guide

This document explains how multi-tenancy works in this repository (a Next.js
CMS where each **site** is a tenant with its own subdomain, content, and
settings) and gives a step-by-step flow for building a similar multi-tenant
application from scratch, or for extending this one.

## 1. Multi-Tenancy Model Used Here

**Pattern:** Shared database, shared schema, row-level tenant isolation,
subdomain-based routing.

- Every tenant is a row in the `sites` table (`prisma/schema.prisma`), keyed
  by a unique `site_id` and a unique `site_subdomain` (with an optional
  `site_custom_domain`).
- Tenant-owned data (`documents`, `blog`, `category`, `author`) carries a
  `site_id` (and/or `user_id`) column that scopes every query to one tenant.
- There is no separate database or schema per tenant — isolation is enforced
  in application code (every Supabase query filters `.eq("site_id", ...)`
  or `.eq("user_id", ...)`), not by the database itself.
- Tenants are resolved from the request's hostname in `middleware.ts`, then
  the URL is internally rewritten to a dynamic route segment
  `app/[site_id]/...` that renders the tenant's public site.
- Tenant owners manage their site(s) from an authenticated dashboard at
  `app/cms/sites/[site_id]/...`, gated by Clerk auth + an `Authorization()`
  check that the requesting user actually owns that `site_id`.

### Request flow

```
request: acme.tsafi.xyz/about
   │
   ▼
middleware.ts
   - extract "acme" from the Host header
   - look up site by subdomain (readSiteDomain)
   - rewrite URL -> /{site_id}/about
   │
   ▼
app/[site_id]/layout.tsx
   - readSiteById(site_id) -> site metadata (name, logo, description)
   - notFound() if site_id doesn't exist
   │
   ▼
app/[site_id]/[slug]/page.tsx
   - fetch tenant-scoped content (blog/document) filtered by site_id
```

### Key files to read as reference

| Concern | File |
|---|---|
| Tenant resolution from hostname | `middleware.ts` |
| Tenant lookup by subdomain | `utils/actions/sites/read-site-domain.ts` |
| Tenant lookup by id | `utils/actions/sites/read-site-id.ts` |
| Tenant creation | `utils/actions/sites/create-site.ts` |
| Tenant ownership check | `utils/actions/authorization.ts` |
| Public tenant layout | `app/[site_id]/layout.tsx` |
| Tenant dashboard | `app/cms/sites/[site_id]/*` |
| Data model | `prisma/schema.prisma` |

---

## 2. Step-by-Step Flow to Build a Multi-Tenant App

### Step 1 — Choose an isolation strategy

- **Shared DB, shared schema, row-scoped by `tenant_id`** (used in this repo).
  Cheapest to run and scale; isolation is only as strong as your query
  discipline (and RLS policies, if using Postgres RLS).
- **Shared DB, schema-per-tenant** or **DB-per-tenant**. Stronger isolation,
  more operational overhead. Only worth it for compliance-heavy or very
  large tenants.

For most SaaS products, start with row-scoping (this repo's approach) and
add Postgres Row-Level Security policies keyed on `tenant_id`/`site_id` so
isolation is enforced at the database layer too, not only in application code.

### Step 2 — Model the tenant

Add a `tenants` (here: `sites`) table with:
- a stable internal id (`site_id`, uuid or cuid — don't use it as a secret)
- a unique routing key: `subdomain` (and optionally `custom_domain`)
- an owner reference (`user_id`)
- tenant-specific settings/branding (`name`, `logo`, `description`, etc.)

Every tenant-owned table (content, categories, members, etc.) must carry a
`site_id` (or `tenant_id`) foreign key. Never rely on a table being
"implicitly" scoped — always filter explicitly.

### Step 3 — Resolve tenant from the request

In `middleware.ts`:
1. Read the `Host` header.
2. Strip your base domain to get the subdomain (dev vs prod need different
   logic, e.g. `localhost:3000` vs your real `BASE_DOMAIN`).
3. Look up the tenant by subdomain (and separately support custom domains —
   see `read-site-custom-domain.ts`).
4. If found, `NextResponse.rewrite` the request into a tenant-scoped route,
   e.g. `/{site_id}/{...path}`. If not found, fall through to the marketing/
   root site (`NextResponse.next()`).

Keep this lookup fast (it runs on every request) — cache it or keep the
table small/indexed on `subdomain`.

### Step 4 — Build tenant-scoped routing

Use a dynamic route segment for the tenant, e.g. `app/[site_id]/...`:
- In the segment's `layout.tsx`, resolve the tenant record once
  (`readSiteById`), call `notFound()` if it doesn't exist, and use it to
  drive per-tenant branding (title, favicon, meta tags, logo, nav).
- Every page/component under this segment receives `params.site_id` and
  must use it to scope all data fetching.

### Step 5 — Enforce tenant scoping in every data access

- **Public read paths** (rendering a tenant's site): filter by `site_id`
  only — no auth required (e.g. `read-articles.ts`).
- **Owner-authenticated paths** (CMS/dashboard): filter by both `user_id`
  (from Clerk `auth()`) and `site_id`, and additionally verify the user
  owns that `site_id` before allowing mutations — see the `Authorization()`
  pattern in `utils/actions/authorization.ts`. Call this at the start of any
  server action that mutates a specific site's data.
- Never trust a `site_id` passed from the client without re-verifying
  ownership server-side, since dynamic route params can be tampered with.

### Step 6 — Tenant management UI (owner-facing)

Build a dashboard (`app/cms/sites/...` in this repo) where an authenticated
user can:
- create a tenant (`createSites`) — validate subdomain format, reserve
  words like `www`, enforce uniqueness (unique constraint + friendly error
  on conflict, see the `23505` Postgres unique-violation handling in
  `CreateSite.tsx`)
- list/select their tenants (`read-sites.ts`)
- edit tenant settings: name, description, subdomain, logo (each as its own
  server action under `utils/actions/sites/settings/`)
- delete a tenant (`delete-site.ts`) — cascade-delete or orphan-check
  tenant-owned content
- attach a custom domain (`vercel/add-domain.ts`, `verify-domain.ts` — this
  repo automates Vercel domain attachment via their API for custom domains)

### Step 7 — Custom domains (optional but common for SaaS)

1. Store `custom_domain` on the tenant row.
2. When a request's hostname doesn't match your base domain, look it up by
   `custom_domain` instead of `subdomain`.
3. Automate domain verification/attachment via your hosting provider's API
   (Vercel Domains API is used here) so tenant owners can self-serve DNS
   setup instead of filing a support ticket.

### Step 8 — Authentication & authorization boundaries

- Use a route matcher (`createRouteMatcher` from Clerk here) to decide which
  paths require auth (e.g. everything under `/cms`) vs. public tenant pages.
- Keep "is logged in" (Clerk `auth()`) and "owns this tenant"
  (`Authorization(site_id)`) as two separate checks — every mutation should
  do both.

### Step 9 — Testing tenant isolation

Before shipping, verify:
- Tenant A cannot read/write Tenant B's data by guessing/forging `site_id`
  in a URL or request body.
- Deleting/renaming one tenant doesn't affect others.
- Subdomain and custom-domain resolution both correctly 404 for unknown
  hosts instead of leaking another tenant's content.
- If using Postgres RLS: policies are actually enabled per table (RLS is
  opt-in per table in Postgres) and tested with a non-superuser DB role.

### Step 10 — Operational concerns

- Add a unique index on `subdomain` and `custom_domain` (nullable-unique) to
  prevent race conditions on tenant creation.
- Add indexes on every `site_id`/`tenant_id` foreign key column used in
  `WHERE` filters — this is your hottest query path.
- Rate-limit tenant creation to prevent abuse (subdomain squatting).
- Reserve system subdomains (`www`, `api`, `app`, `admin`, etc.) so tenants
  can't claim them.

---

## 3. Minimal Checklist for Adding a New Tenant-Scoped Feature

When adding any new feature/table to this app:

1. Add a `site_id` column to the new table.
2. Write server actions that always filter by `site_id` (and `user_id` for
   owner-only actions).
3. If it's a mutation, call `Authorization(site_id)` first and bail if it
   returns no rows.
4. Place public-facing pages under `app/[site_id]/...` and dashboard pages
   under `app/cms/sites/[site_id]/...`.
5. Never expose cross-tenant aggregate queries to tenant-facing UIs.
