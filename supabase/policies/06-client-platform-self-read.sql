-- Clients are platform-level (05-client-platform-scope.sql) and can hold
-- Cases with consultants across multiple tenants. A client's own "my
-- appointments across every tenant" view (apps/api's GET /api/clients/me)
-- has no single app.tenant_id to scope by, so 00-tenant-isolation.sql's
-- generic `tenant_id = app.tenant_id` policy denies everything for that
-- request. These policies add a narrow, SELECT-only, self-only carve-out:
-- a client may always read their own Cases and whatever hangs off them
-- (Appointments, client-visible Documents, the linked ConsultantProfile),
-- regardless of which tenant is currently in session context. They grant
-- no INSERT/UPDATE/DELETE — write paths stay tenant-scoped as before.
--
-- These policies used to join public.client_profiles directly, but
-- client_profiles' own policy (05-client-platform-scope.sql) joins back
-- into public.cases — that mutual reference sends Postgres into
-- "infinite recursion detected in policy for relation client_profiles"
-- (42P17) as soon as either table is queried. current_client_profile_id()
-- is SECURITY DEFINER, so it reads client_profiles as the function owner
-- and bypasses client_profiles' RLS instead of re-triggering it.

create or replace function public.current_client_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.client_profiles
   where user_id = nullif(current_setting('app.user_id', true), '')::uuid
$$;

revoke execute on function public.current_client_profile_id() from public, anon;
grant execute on function public.current_client_profile_id() to app_user;

drop policy if exists client_platform_self_read on public.cases;
create policy client_platform_self_read on public.cases
  for select
  using (
    cases.client_id = public.current_client_profile_id()
  );

drop policy if exists client_platform_self_read on public.appointments;
create policy client_platform_self_read on public.appointments
  for select
  using (
    exists (
      select 1
        from public.cases c
       where c.id = appointments.case_id
         and c.client_id = public.current_client_profile_id()
    )
  );

drop policy if exists client_platform_self_read on public.documents;
create policy client_platform_self_read on public.documents
  for select
  using (
    documents.is_client_visible
    and exists (
      select 1
        from public.cases c
       where c.id = documents.case_id
         and c.client_id = public.current_client_profile_id()
    )
  );

drop policy if exists client_platform_self_read on public.consultant_profiles;
create policy client_platform_self_read on public.consultant_profiles
  for select
  using (
    exists (
      select 1
        from public.cases c
       where c.consultant_id = consultant_profiles.id
         and c.client_id = public.current_client_profile_id()
    )
  );

-- A client's cases (and thus GET /clients/me's per-case tenant display info)
-- can span multiple tenants at once, so 02-tenants.sql's tenant_read_own
-- policy (single app.tenant_id match) isn't enough here — same shape as the
-- carve-outs above.
drop policy if exists client_platform_self_read on public.tenants;
create policy client_platform_self_read on public.tenants
  for select
  using (
    exists (
      select 1
        from public.cases c
       where c.tenant_id = tenants.id
         and c.client_id = public.current_client_profile_id()
    )
  );
