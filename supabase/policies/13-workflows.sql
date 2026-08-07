-- The other exception to the standard tenant-isolation policy (alongside
-- workflow_templates, grievances) — a SUPER_ADMIN-authored COMMUNITY
-- workflow has tenant_id = null and must still be visible/usable from every
-- tenant, not just whichever one a plain tenant_id match would allow. Every
-- other scope (PERSONAL/TENANT) always carries a real tenant_id and behaves
-- exactly like the generic tenant_isolation policy it replaces.

alter table public.workflows enable row level security;

-- COMMUNITY rows are visible to anyone, any tenant, regardless of status
-- (unlike workflow_templates, a workflow's scope has never gated visibility
-- by moderation status — see workflows.router.ts's GET, which returns every
-- workflow in scope regardless of who created it). PERSONAL/TENANT rows
-- stay tenant-scoped as before. Super Admin sees everything.
drop policy if exists workflows_scope_policy on public.workflows;
create policy workflows_scope_policy on public.workflows
  for select
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or scope = 'COMMUNITY'
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

-- A CONSULTANT/TENANT_ADMIN always writes their own tenant_id (PERSONAL/
-- TENANT); a Super Admin's COMMUNITY row is the only one ever written with
-- tenant_id null — workflows.router.ts's POST handler enforces that pairing.
drop policy if exists workflows_write_policy on public.workflows;
create policy workflows_write_policy on public.workflows
  for insert
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    or (
      current_setting('app.is_super_admin', true) = 'true'
      and tenant_id is null
    )
  );

-- Same visibility shape as the select policy — a CONSULTANT in any tenant
-- must be able to publish/pause/resume/archive a COMMUNITY workflow
-- (workflows.router.ts's requireWorkflowManagePermission /
-- requirePauseResumePermission are the real role-based enforcement here,
-- this just has to not filter the row out first).
drop policy if exists workflows_update_policy on public.workflows;
create policy workflows_update_policy on public.workflows
  for update
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or scope = 'COMMUNITY'
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or scope = 'COMMUNITY'
    or tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );
