-- Provisions the public.users row for a self-service Client signup
-- synchronously, in the same transaction as the auth.users insert
-- (docs/sprints_v3.md Sprint 1.2 task 3). This closes the chicken-and-egg
-- gap in stamp-tenant-claim.sql: that hook only stamps real tenant_id/role
-- claims onto a JWT when a matching public.users row already exists at
-- token-mint time, so without this trigger a brand-new Client's very first
-- token would always be claimless. Running inside the same transaction as
-- signup means the row exists before Supabase ever issues that first token.
--
-- Only fires for the public register flow (apps/web/app/(tenant)/[slug]/
-- (public)/register/page.tsx), which passes `tenant_slug` in
-- supabase.auth.signUp()'s options.data. The admin-invite paths
-- (tenants.router.ts's tenant-creation transaction, users.router.ts's
-- invite endpoint) also call supabase.auth.admin.inviteUserByEmail, which
-- fires this same trigger, but never set this metadata key — those flows
-- already create their own public.users row explicitly via Prisma, so this
-- trigger no-ops and stays out of their way.

create or replace function public.handle_new_client_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_tenant record;
begin
  v_slug := new.raw_user_meta_data->>'tenant_slug';

  if v_slug is null then
    return new;
  end if;

  -- Never trust the metadata's tenant identity directly (a self-registering
  -- caller controls their own signUp() payload) — re-derive the real tenant
  -- by looking the slug up against the authoritative tenants table, and
  -- only provision if it resolves to an ACTIVE tenant.
  select id, status into v_tenant from public.tenants where slug = v_slug;

  if v_tenant.id is null or v_tenant.status <> 'ACTIVE' then
    return new;
  end if;

  -- Role is always the hardcoded literal 'CLIENT' — never sourced from
  -- metadata — since this trigger only ever backs the public
  -- self-registration page.
  insert into public.users (supabase_auth_user_id, tenant_id, role, email, email_is_verified)
  values (new.id, v_tenant.id, 'CLIENT', new.email, new.email_confirmed_at is not null)
  on conflict (supabase_auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_client on auth.users;
create trigger on_auth_user_created_client
  after insert on auth.users
  for each row execute function public.handle_new_client_user();
