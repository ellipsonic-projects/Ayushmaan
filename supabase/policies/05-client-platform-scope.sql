-- Clients are platform-level (schema_ayushman_v3.md tenancy note, updated):
-- client_profiles, client_category_profiles and guardian_links carry no
-- tenant_id column, so 00-tenant-isolation.sql's generic policy doesn't
-- apply to them. A client's association with a tenant is expressed through
-- Case.tenant_id (the consultant's tenant) instead.
--
-- Each policy below grants access when any of:
--   - the caller is a super admin, or
--   - the row belongs to the caller themself (self-service), or
--   - the client has at least one Case in the tenant currently in
--     app.tenant_id (a tenant-scoped consultant/admin's view of "their"
--     clients).
--
-- `users` keeps its generic tenant_id-column policy from
-- 00-tenant-isolation.sql (for SUPER_ADMIN/TENANT_ADMIN/CONSULTANT rows,
-- unaffected by this change) — this file adds a second, permissive policy
-- (permissive policies on the same table/command are OR'd) covering
-- CLIENT-role rows, whose tenant_id is now always null.

drop policy if exists client_platform_scope on public.users;
create policy client_platform_scope on public.users
  for all
  using (
    role = 'CLIENT'
    and (
      current_setting('app.is_super_admin', true) = 'true'
      or id = nullif(current_setting('app.user_id', true), '')::uuid
      or exists (
        select 1
          from public.client_profiles cp
          join public.cases c on c.client_id = cp.id
         where cp.user_id = users.id
           and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
    )
  )
  with check (
    role = 'CLIENT'
    and (
      current_setting('app.is_super_admin', true) = 'true'
      or id = nullif(current_setting('app.user_id', true), '')::uuid
      or exists (
        select 1
          from public.client_profiles cp
          join public.cases c on c.client_id = cp.id
         where cp.user_id = users.id
           and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
    )
  );

-- The "has a Case in my tenant" carve-out doesn't cover a TENANT_ADMIN
-- reviewing a first-time consultant application (consultant-applications.
-- router.ts's /approve, /reject) — that client has no Case with the tenant
-- yet, since applying to become a consultant is how they'd first get one.
-- Same shape as 08-consultant-applications.sql's carve-out on `users`.
alter table public.client_profiles enable row level security;
drop policy if exists client_platform_scope on public.client_profiles;
create policy client_platform_scope on public.client_profiles
  for all
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or exists (
      select 1 from public.cases c
       where c.client_id = client_profiles.id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or exists (
      select 1 from public.consultant_applications ca
       where ca.user_id = client_profiles.user_id
         and ca.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or exists (
      select 1 from public.cases c
       where c.client_id = client_profiles.id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or exists (
      select 1 from public.consultant_applications ca
       where ca.user_id = client_profiles.user_id
         and ca.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );

alter table public.client_category_profiles enable row level security;
drop policy if exists client_platform_scope on public.client_category_profiles;
create policy client_platform_scope on public.client_category_profiles
  for all
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or exists (
      select 1 from public.client_profiles cp
       where cp.id = client_category_profiles.client_id
         and cp.user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
    or exists (
      select 1 from public.cases c
       where c.client_id = client_category_profiles.client_id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or exists (
      select 1 from public.client_profiles cp
       where cp.id = client_category_profiles.client_id
         and cp.user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
    or exists (
      select 1 from public.cases c
       where c.client_id = client_category_profiles.client_id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );

alter table public.guardian_links enable row level security;
drop policy if exists client_platform_scope on public.guardian_links;
create policy client_platform_scope on public.guardian_links
  for all
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or guardian_user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or exists (
      select 1 from public.cases c
       where c.client_id = guardian_links.minor_client_id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or guardian_user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or exists (
      select 1 from public.cases c
       where c.client_id = guardian_links.minor_client_id
         and c.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );
