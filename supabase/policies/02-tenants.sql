-- `tenants` itself has no tenant_id column (it IS the tenant) — a session
-- can read its own tenant row (needed by GET /api/auth/me's tenant lookup
-- and apps/web's subdomain resolution) or any row as SUPER_ADMIN. Writes
-- (provisioning/suspend/archive, Sprint 1.1) are SUPER_ADMIN-only.

alter table public.tenants enable row level security;

drop policy if exists tenant_read_own on public.tenants;
create policy tenant_read_own on public.tenants
  for select
  using (
    id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or current_setting('app.is_super_admin', true) = 'true'
  );

drop policy if exists tenant_write_super_admin on public.tenants;
create policy tenant_write_super_admin on public.tenants
  for insert
  with check (current_setting('app.is_super_admin', true) = 'true');

drop policy if exists tenant_update_super_admin on public.tenants;
create policy tenant_update_super_admin on public.tenants
  for update
  using (current_setting('app.is_super_admin', true) = 'true')
  with check (current_setting('app.is_super_admin', true) = 'true');

drop policy if exists tenant_delete_super_admin on public.tenants;
create policy tenant_delete_super_admin on public.tenants
  for delete
  using (current_setting('app.is_super_admin', true) = 'true');
