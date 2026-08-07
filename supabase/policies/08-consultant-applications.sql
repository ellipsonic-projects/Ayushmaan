-- consultant_applications rows must stay visible to two different parties
-- with different app.tenant_id context: the TENANT_ADMIN reviewing them
-- (app.tenant_id set to the tenant) and the CLIENT applicant themselves
-- (users.tenant_id is always null for CLIENT — same platform-level carve-out
-- shape as notification_preferences/push_subscriptions in
-- 01-tenant-isolation-child-tables.sql), so this can't use the plain
-- tenant_id-only shape from 00-tenant-isolation.sql.

-- Approving/rejecting an application means a TENANT_ADMIN needs to see (and,
-- on approve, update the role/tenant_id of) the applicant's `users` row —
-- but that row is a CLIENT (tenant_id null, platform-level) who may have no
-- Case with this tenant yet, so 05-client-platform-scope.sql's Case-based
-- carve-out doesn't cover it. This is one more permissive policy (OR'd with
-- the others already on `users`), scoped to "there's a ConsultantApplication
-- from this user to my tenant". with check omits the role='CLIENT' guard
-- (unlike using) because approval's UPDATE changes role away from CLIENT —
-- the post-update row is covered instead by 00-tenant-isolation.sql's plain
-- tenant_id match, since tenant_id is set to the admin's own tenant in the
-- same update.
drop policy if exists consultant_application_scope on public.users;
create policy consultant_application_scope on public.users
  for all
  using (
    role = 'CLIENT'
    and exists (
      select 1 from public.consultant_applications ca
       where ca.user_id = users.id
         and ca.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.consultant_applications ca
       where ca.user_id = users.id
         and ca.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );

alter table public.consultant_applications enable row level security;
drop policy if exists tenant_isolation on public.consultant_applications;
create policy tenant_isolation on public.consultant_applications
  for all
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or current_setting('app.is_super_admin', true) = 'true'
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or user_id = nullif(current_setting('app.user_id', true), '')::uuid
    or current_setting('app.is_super_admin', true) = 'true'
  );
