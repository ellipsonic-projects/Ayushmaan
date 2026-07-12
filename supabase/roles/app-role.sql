-- apps/api's DATABASE_URL currently connects via Supabase's pooler as
-- `postgres.<project-ref>`, which maps to the `postgres` role — the owner
-- of every table created by Prisma migrations. Postgres table owners
-- bypass Row-Level Security unconditionally, regardless of policies or
-- `SET LOCAL app.tenant_id` (packages/db/src/rls-context.ts). That means
-- every policy under supabase/policies/ currently enforces nothing against
-- apps/api's own queries — RLS only bites a non-owner role.
--
-- This role is that non-owner: apps/api should connect as `app_user`, not
-- `postgres`, for RLS to actually apply. Migrations/db:push/seed can keep
-- using the owner (`postgres`) connection — only the request-serving
-- connection pool needs to switch.
--
-- Manual steps (this file only creates the role — applying it and rotating
-- the live DATABASE_URL are deliberately left to be done by hand):
--   1. Run this file against the database (Supabase SQL Editor, or
--      `psql "$DATABASE_URL" -f supabase/roles/app-role.sql`), replacing
--      the placeholder password below with a generated secret.
--   2. Build a new DATABASE_URL using `app_user` instead of
--      `postgres.<project-ref>` as the username, same host/pooler.
--   3. Update apps/api/.env's DATABASE_URL to the app_user connection
--      string. Keep the old postgres-owner URL around separately for
--      `pnpm --filter @ayushman/db db:push` / `db:migrate` / `db:seed`.

create role app_user with login password 'wasdwasdwasd12';

-- Lets `postgres` administer/drop this role later (DROP OWNED BY / DROP ROLE
-- otherwise fail with "permission denied to drop objects" since granting
-- privileges to a role doesn't imply membership in it).
grant app_user to postgres;

grant usage on schema public to app_user;

-- Present-tense grant for tables that already exist...
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;

-- ...and default privileges so every table a *future* migration adds is
-- automatically covered without a follow-up grant.
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public
  grant usage, select on sequences to app_user;

-- Needed for the SECURITY DEFINER escalation path (schema §4.2) and the
-- Auth Hook's own claim-stamping — app_user calls the former, not the
-- latter (that's supabase_auth_admin, see supabase/auth-hooks/).
grant execute on function public.tenant_admin_view_case(uuid, text) to app_user;
