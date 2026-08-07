-- schema_ayushman_v3.md §4.3 — the one table without the standard tenant
-- isolation policy. tenant_id here is metadata for the Super Admin's own
-- filtering, never an access boundary: no policy exists for TENANT_ADMIN or
-- CONSULTANT on this table, on purpose (PRD §4.2) — a grievance may be about
-- the tenant itself, so the tenant it names must never be able to read or
-- suppress it.

alter table public.grievances enable row level security;

drop policy if exists grievance_client_own on public.grievances;
create policy grievance_client_own on public.grievances
  for select
  using (
    client_id in (
      select id from public.client_profiles
       where user_id = current_setting('app.user_id', true)::uuid
    )
  );

drop policy if exists grievance_client_submit on public.grievances;
create policy grievance_client_submit on public.grievances
  for insert
  with check (
    client_id in (
      select id from public.client_profiles
       where user_id = current_setting('app.user_id', true)::uuid
    )
  );

drop policy if exists grievance_super_admin_all on public.grievances;
create policy grievance_super_admin_all on public.grievances
  for all
  using (current_setting('app.is_super_admin', true) = 'true')
  with check (current_setting('app.is_super_admin', true) = 'true');
