-- Clients need to search ALL organizations on the platform (not just ones
-- they already have a Case with) to start a new booking request. Neither
-- 02-tenants.sql's tenant_read_own (single app.tenant_id match) nor
-- 06-client-platform-self-read.sql's client_platform_self_read (requires an
-- existing Case) cover browsing tenants with no prior relationship.
--
-- Permissive policies on the same table/command are OR'd, so this only adds
-- visibility of active tenants — it doesn't weaken any existing policy.
drop policy if exists tenant_directory_read on public.tenants;
create policy tenant_directory_read on public.tenants
  for select
  using (status = 'ACTIVE');
