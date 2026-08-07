-- Mirrors 07-tenant-directory-read.sql: a CLIENT browsing which tenants serve
-- a given field of consultancy (apps/web's book-appointment flow, step 1)
-- needs to read consultant_profiles across every tenant, not just one it
-- already has a Case with — the generic tenant_isolation policy in
-- 00-tenant-isolation.sql only permits rows matching the caller's own
-- app.tenant_id. Scoped to isAcceptingNewClients so the directory never
-- surfaces a consultant a client couldn't actually book anyway.
--
-- Permissive policies on the same table/command are OR'd, so this only adds
-- visibility — it doesn't weaken the existing tenant_isolation policy.
drop policy if exists consultant_directory_read on public.consultant_profiles;
create policy consultant_directory_read on public.consultant_profiles
  for select
  using (is_accepting_new_clients = true);
