-- Postgres Auth Hook: stamps tenant_id/is_super_admin/role onto the access
-- token JWT at sign-in (PRD_v3_nextjs_express.md §7.3, schema_ayushman_v3.md
-- §1 note). This is the ONLY place a tenant_id/is_super_admin claim is ever
-- set — apps/api's tenant-scoping middleware (Sprint 1.3) only ever reads it
-- back out of a verified token, never accepts one as client input, and every
-- RLS policy under supabase/policies/ trusts these exact claim names.
--
-- Wire-up (cannot be done from SQL alone — a dashboard/Management API step):
--   Supabase Dashboard > Authentication > Hooks (Beta) > Customize Access
--   Token (Custom Access Token) > select `public.custom_access_token_hook`.
-- This must be enabled before Sprint 1.2's login flow can be tested
-- end-to-end (docs/sprints_v3.md Sprint 0.3 note).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  claims jsonb;
  found_user record;
begin
  select role, tenant_id
    into found_user
    from public.users
   where supabase_auth_user_id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if found_user is null then
    -- No matching public.users row yet. Under normal operation this
    -- shouldn't happen: handle-new-client-signup.sql's trigger provisions
    -- self-service Client signups synchronously in the same transaction as
    -- their auth.users insert, and the admin-invite paths (tenants.router.ts,
    -- users.router.ts) create the row via Prisma right after inviting. This
    -- branch only fires for a bogus/inactive tenant_slug at signup, or a
    -- genuine race — issue a claimless token rather than fail sign-in
    -- outright.
    claims := jsonb_set(claims, '{tenant_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{is_super_admin}', 'false'::jsonb);
  elsif found_user.role = 'SUPER_ADMIN' then
    claims := jsonb_set(claims, '{tenant_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{is_super_admin}', 'true'::jsonb);
    claims := jsonb_set(claims, '{role}', to_jsonb(found_user.role));
  elsif found_user.role = 'CLIENT' then
    -- Clients are platform-level — never stamp a home tenant_id, even if
    -- users.tenant_id happens to carry a stale value. Which tenant a client
    -- is acting in is resolved per-request from the URL, not the token.
    claims := jsonb_set(claims, '{tenant_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{is_super_admin}', 'false'::jsonb);
    claims := jsonb_set(claims, '{role}', to_jsonb(found_user.role));
  else
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(found_user.tenant_id));
    claims := jsonb_set(claims, '{is_super_admin}', 'false'::jsonb);
    claims := jsonb_set(claims, '{role}', to_jsonb(found_user.role));
  end if;

  update public.users
     set last_login_at = now()
   where supabase_auth_user_id = (event->>'user_id')::uuid;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Supabase's auth server (role supabase_auth_admin) is the only caller —
-- never grant this to authenticated/anon, or a client could invoke it
-- directly and read another user's role/tenant assignment.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- The hook runs as supabase_auth_admin (via the grant above), which has no
-- implicit SELECT/UPDATE on public.users — RLS would otherwise block it.
grant select, update (last_login_at) on public.users to supabase_auth_admin;
