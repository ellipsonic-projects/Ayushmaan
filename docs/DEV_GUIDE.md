# Developer Guide

## Phase 0 — Monorepo Foundation & Data Layer

Phase 0 turned the repo into a proper pnpm/Turborepo monorepo with a shared
Prisma data layer, working lint/format/CI tooling, and a first pass at
Supabase RLS enforcement. Summary below; sprint-by-sprint detail lives in
[sprints_v3.md](./sprints_v3.md).

### What's implemented

**Sprint 0.1 — Monorepo & Tooling**

- pnpm workspaces (`apps/*`, `packages/*`) + Turborepo pipelines for
  `dev`/`build`/`lint`/`type-check`/`test`.
- Shared `tsconfig.base.json` in `packages/config`, extended by every app/package.
- Root ESLint flat config + a Next.js-specific overlay in `apps/web`.
- Prettier, Husky pre-commit hook, lint-staged.
- GitHub Actions CI (`.github/workflows/ci.yml`) running install → prisma
  generate → lint → type-check → build on every push/PR.

**Sprint 0.2 — Prisma Schema & Migrations**

- All 25+ domain tables live in `packages/db/prisma/schema.prisma` (Tenant,
  User, ConsultantProfile, Appointment, Case, Grievance, AuditLog, etc.).
- `packages/db` is the single shared data-access package — `apps/api` is its
  only runtime consumer; `apps/web` has no Prisma dependency by design.
- `withTenantContext()` (`packages/db/src/rls-context.ts`) wraps every DB call
  in a transaction that sets `app.tenant_id` / `app.is_super_admin` /
  `app.user_id` session variables, which the RLS policies below key off of.

**Sprint 0.3 — Supabase Provisioning & RLS Skeleton**

- `supabase/policies/*.sql` — tenant-isolation RLS policies for every
  tenant-scoped table, including child tables without their own `tenant_id`,
  the `tenants` table's own read policy, the `tenant_admin_view_case()`
  cross-tenant escalation function, and the `grievances` exception (client +
  super-admin only, no tenant-admin/consultant access).
- `supabase/auth-hooks/stamp-tenant-claim.sql` — `custom_access_token_hook`
  that stamps `tenant_id`/`role`/`is_super_admin` into the JWT.
- `supabase/storage-policies/tenant-case-prefix.sql` — storage bucket RLS
  keyed off a tenant-id path prefix.
- `supabase/roles/app-role.sql` — creates a non-owner `app_user` Postgres role.
  **Required**: Supabase's pooled connection normally connects as the table
  _owner_, which bypasses RLS unconditionally — `apps/api` must run as
  `app_user` for the policies above to mean anything.
- `apps/api/tests/integration/rls-policies.test.ts` — integration test that
  proves tenant isolation, and refuses to run (loud, explicit error) if the
  connection is still a superuser/owner/BYPASSRLS role.

### Manual steps still owed (not automatable — touch live Supabase state)

1. Run `supabase/roles/app-role.sql` against the database, then point
   `DATABASE_URL` at `app_user` (keep the current owner URL as
   `MIGRATE_DATABASE_URL` for migrations/seeding).
2. Apply `supabase/policies/*.sql` and `supabase/storage-policies/*.sql`.
3. Enable the Auth Hook in the Supabase dashboard (Authentication → Hooks →
   Custom Access Token → `public.custom_access_token_hook`).
4. Add demo tenant/account seed data to `packages/db/prisma/seed.ts`.

## Testing

There's no unit-test suite yet — Phase 0 only ships the tooling and one
integration test. This section covers everything that can currently be run
to verify the repo is healthy, from cheapest/fastest to most involved.

### Static checks (no DB, no network — safe to run anytime)

| Command                 | What it checks                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm turbo lint`       | ESLint across every app/package (root flat config + Next.js overlay in `apps/web`).                                                          |
| `pnpm turbo type-check` | `tsc --noEmit` in every app/package against the shared `packages/config/tsconfig.base.json`.                                                 |
| `pnpm turbo build`      | Full build (`tsc` for `apps/api`, `next build` for `apps/web`) — catches anything lint/type-check miss (e.g. Next.js route/type generation). |
| `pnpm format:check`     | Prettier formatting check across the repo (run `pnpm format` to fix).                                                                        |
| `git commit`            | Husky's pre-commit hook runs `lint-staged`, which Prettier-formats staged files automatically.                                               |

Run `pnpm --filter <pkg> <script>` (e.g. `pnpm --filter @ayushman/api type-check`)
to scope any of the above to one package instead of the whole monorepo.

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR to `main`/`dev`: install →
`prisma generate` → lint → type-check → build, using dummy env vars (no real
Supabase/DB credentials needed since nothing in that pipeline hits a live
database).

### Integration tests (require a live database connection)

| Command                            | What it does                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ayushman/api test` | Runs `apps/api/tests/**/*.test.ts` via Vitest, sequentially (`fileParallelism: false`) since tests share one DB connection pool. |

Currently the only integration test is
**`apps/api/tests/integration/rls-policies.test.ts`** — RLS tenant isolation:

- Creates two throwaway tenants (Tenant A, Tenant B) and one user under Tenant A.
- Asserts Tenant A can read its own user row (`lets a tenant read its own row`).
- Asserts Tenant B **cannot** read Tenant A's user row (`blocks a different
tenant from reading the row`) — this is the actual RLS enforcement check.
- Asserts a super admin can read across both tenants (`lets a super admin
read across tenants`).
- Cleans up both tenants (and the user) in `afterAll`, so it leaves no
  residue in the database on success.

**Guard clause:** before creating any fixtures, the test queries
`pg_roles`/`pg_tables` for the current connection and throws immediately if
it's a superuser, has `BYPASSRLS`, or owns the `users` table — any of which
would make the "blocks a different tenant" assertion pass for the wrong
reason (no RLS actually being enforced). This means the suite only proves
anything once the manual `app_user` role migration is done — see step 1
under "Manual steps still owed" above. Until then it fails fast with a
message pointing at `supabase/roles/app-role.sql`.

### Manual/live verification (not scripted)

- `curl http://localhost:3001/health` → `{"status":"ok"}` with no auth
  header — regression check for route registration order in
  `apps/api/src/index.ts` (health check must stay ahead of the global auth
  middleware).
- Supabase OTP/magic-link flow: trigger `signInWithOtp` (e.g. via
  `packages/db/prisma/seed.ts`'s Super Admin seed) and confirm the email
  lands on `${WEB_APP_URL}/auth/callback` rather than the project's default
  Supabase Site URL.
- Once the Auth Hook (`supabase/auth-hooks/stamp-tenant-claim.sql`) is
  enabled in the Supabase dashboard, decode a fresh access token (e.g. at
  jwt.io) and confirm it carries `tenant_id`/`role`/`is_super_admin` claims.

## File reference

### `packages/config`

| File                 | Purpose                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `tsconfig.base.json` | Shared compiler options (`strict`, `esModuleInterop`, etc.) every app/package extends. |

### `packages/types`

| File           | Purpose                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts` | Cross-app, Prisma-free type-only shapes (`UserRole`, `ConsultantCategory`). Keeps `apps/web` free of a Prisma dependency. |

### `packages/shared`

| File               | Purpose                             |
| ------------------ | ----------------------------------- |
| `src/constants.ts` | Plain constants shared across apps. |

### `packages/db`

| File                   | Purpose                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | The full domain data model (25+ tables).                                                                                                        |
| `prisma/seed.ts`       | Seeds the Super Admin account via Supabase Auth + Prisma; sends an OTP/magic-link.                                                              |
| `prisma.config.ts`     | Prisma 7 config — loads env from `apps/api/.env(.local)`, prefers `MIGRATE_DATABASE_URL` for schema operations.                                 |
| `src/client.ts`        | Single `PrismaClient` singleton (driver adapter over `pg`), the only Prisma import point for the whole repo.                                    |
| `src/rls-context.ts`   | `withTenantContext()` — sets `app.tenant_id`/`app.is_super_admin`/`app.user_id` session vars inside a transaction for every RLS-governed query. |

### `apps/api`

| File                                     | Purpose                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                           | Express entrypoint; route registration order (health check before auth middleware).                                                            |
| `src/middleware/auth.ts`                 | Verifies the caller's token via `authVerifier` (see below), attaches user/tenant context. Provider-agnostic — never imports Supabase directly. |
| `src/lib/auth/types.ts`                  | `AuthVerifier` interface + `AuthIdentity` shape — the contract any identity provider must satisfy server-side.                                 |
| `src/lib/auth/supabase-verifier.ts`      | `SupabaseAuthVerifier` — the only file that calls `supabaseAdmin.auth.getUser`.                                                                |
| `src/lib/auth/index.ts`                  | Wires up the active provider (`export const authVerifier = new SupabaseAuthVerifier()`). Swap providers by changing this one line.             |
| `vitest.config.ts`                       | Vitest config — sequential (`fileParallelism: false`) since integration tests share one live DB pool.                                          |
| `tests/setup.ts`                         | Loads `.env` inside each vitest worker process.                                                                                                |
| `tests/integration/rls-policies.test.ts` | Proves cross-tenant reads are blocked and super-admin reads aren't; hard-fails if run against a superuser/owner DB connection.                 |

### `apps/web`

| File                            | Purpose                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local`                    | Client-side Supabase URL/anon key + API URL (gitignored).                                                                          |
| `lib/auth/types.ts`             | `AuthProvider` interface + `AuthSession`/`AuthUser` shapes — the contract any identity provider must satisfy client-side.          |
| `lib/auth/supabase-provider.ts` | `SupabaseAuthProvider` — the only file that calls `supabase.auth.*`.                                                               |
| `lib/auth/index.ts`             | Wires up the active provider (`export const authProvider = new SupabaseAuthProvider()`). Swap providers by changing this one line. |
| `lib/auth/context.tsx`          | `AuthProvider` React context + `useAuth()` hook; depends only on `authProvider`, never the Supabase SDK.                           |
| `lib/supabase/client.ts`        | Raw Supabase browser client — only ever imported by `lib/auth/supabase-provider.ts`.                                               |

### Auth provider abstraction

Both apps isolate the identity provider behind an interface so Supabase can
be swapped for another provider (Auth0, Clerk, a custom service) without
touching call sites:

- **apps/web**: `AuthProvider` (`lib/auth/types.ts`) — `getSession`,
  `onAuthStateChange`, `signInWithPassword`, `signOut`. `AuthContext`
  (`lib/auth/context.tsx`) and `app/auth/callback/page.tsx` call this
  interface exclusively.
- **apps/api**: `AuthVerifier` (`src/lib/auth/types.ts`) — `verifyToken`,
  returning provider-agnostic claims (`providerId`, `email`).
  `middleware/auth.ts` calls this interface exclusively, then looks up the
  local `User` row by `supabaseAuthUserId: identity.providerId` (that
  Prisma column name is the one remaining place the current provider choice
  is baked into the schema).

To migrate off Supabase: implement `AuthProvider`/`AuthVerifier` against the
new provider's SDK and change the single instantiation in each `lib/auth/index.ts`.
No other file in either app imports `@supabase/supabase-js` for auth. (The
raw Supabase Postgrest client used as a data-access client in some
`apps/api/src/routes/*.ts` files is a separate, unrelated usage.)

### `supabase/`

| File                                            | Purpose                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `roles/app-role.sql`                            | Creates the non-owner `app_user` Postgres role RLS depends on.           |
| `policies/00-tenant-isolation.sql`              | Generic tenant-isolation policy applied across all tenant-scoped tables. |
| `policies/01-tenant-isolation-child-tables.sql` | Policies for tables without their own `tenant_id` (joins to parent).     |
| `policies/02-tenants.sql`                       | Read/write policy for the `tenants` table itself.                        |
| `policies/03-tenant-admin-view-case.sql`        | `tenant_admin_view_case()` — audited cross-tenant case access.           |
| `policies/04-grievances.sql`                    | Grievance-specific policy (client + super-admin only).                   |
| `auth-hooks/stamp-tenant-claim.sql`             | Supabase Auth Hook stamping tenant/role claims onto the JWT.             |
| `storage-policies/tenant-case-prefix.sql`       | Storage bucket RLS keyed on tenant-id path prefix.                       |

### Root

| File                                   | Purpose                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `.env.example`                         | Template for every env var the repo needs (DB, Supabase, app URLs, Phase 5-8 integrations). |
| `pnpm-workspace.yaml`                  | Workspace package globs + pnpm build-approval allowlist.                                    |
| `eslint.config.mjs`                    | Shared root ESLint flat config.                                                             |
| `.prettierrc.json` / `.prettierignore` | Formatting rules.                                                                           |
| `.husky/pre-commit`                    | Runs `lint-staged` before every commit.                                                     |
| `.github/workflows/ci.yml`             | CI: install → prisma generate → lint → type-check → build.                                  |
