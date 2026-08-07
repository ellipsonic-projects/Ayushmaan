-- consultant_invite_codes rows are created by a TENANT_ADMIN (tenant-scoped
-- context) but must also be readable by a CLIENT redeeming one (platform-
-- level context, app.tenant_id null — same carve-out shape as
-- 08-consultant-applications.sql) via the lookup-by-code endpoint. A code is
-- a random 6-digit value, not a secret derived from anything sensitive on
-- the row, so permitting read of ACTIVE rows regardless of tenant context is
-- an acceptable trade-off for that lookup to work. Redeeming a code is also a
-- write (status -> USED, used_by set) done from that same platform-level
-- context, so both using and with check need a carve-out — used_by =
-- app.user_id covers exactly that write, since consultant-applications.
-- router.ts always sets used_by to the redeeming CLIENT's own id. Postgres
-- re-validates an UPDATE's resulting row against USING as well as WITH
-- CHECK, not WITH CHECK alone — with the carve-out only on WITH CHECK, the
-- redemption update (status ACTIVE -> USED) satisfied WITH CHECK via
-- used_by but then failed USING, since the new row's status is no longer
-- 'ACTIVE' and used_by isn't one of USING's disjuncts.
alter table public.consultant_invite_codes enable row level security;
drop policy if exists tenant_isolation on public.consultant_invite_codes;
create policy tenant_isolation on public.consultant_invite_codes
  for all
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or current_setting('app.is_super_admin', true) = 'true'
    or status = 'ACTIVE'
    or used_by = nullif(current_setting('app.user_id', true), '')::uuid
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or current_setting('app.is_super_admin', true) = 'true'
    or used_by = nullif(current_setting('app.user_id', true), '')::uuid
  );
