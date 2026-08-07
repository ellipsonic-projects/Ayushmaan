-- Sprint 5.5.1 — the other exception to the standard tenant-isolation policy
-- (alongside grievances, see 04-grievances.sql): visibility here is gated by
-- workflow_templates.scope, not tenant_id alone, so a bare tenant_isolation
-- policy would either over- or under-expose rows. app.consultant_id
-- (packages/db/src/rls-context.ts's withTenantContext) is the first session
-- var this schema needs at consultant granularity rather than tenant/role
-- granularity.

alter table public.workflow_templates enable row level security;

-- COMMUNITY rows are readable by anyone across every tenant once approved
-- (Sprint 5.5.5 item 5's resolved moderation question — status=APPROVED),
-- or by the owning consultant regardless of status (so a submitter can see
-- their own row while it's still PENDING or after a REJECTED verdict);
-- TENANT rows within the reader's own tenant; PERSONAL rows only by the
-- owning consultant; Super Admin sees everything, any status.
drop policy if exists workflow_templates_scope_policy on public.workflow_templates;
create policy workflow_templates_scope_policy on public.workflow_templates
  for select
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
    or (scope = 'COMMUNITY' and status = 'APPROVED')
    or (
      scope = 'TENANT'
      and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );

-- Always tied to the caller's own tenant_id + consultant_id, regardless of
-- the scope being written. A Super Admin has no consultant_id or tenant_id
-- of their own (app.consultant_id/app.tenant_id are unset when acting
-- platform-wide), so they may only insert a row with both left null —
-- workflow-templates.router.ts's authoring POST enforces this is always
-- paired with scope=COMMUNITY.
drop policy if exists workflow_templates_write_policy on public.workflow_templates;
create policy workflow_templates_write_policy on public.workflow_templates
  for insert
  with check (
    (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      and consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
    )
    or (
      current_setting('app.is_super_admin', true) = 'true'
      and consultant_id is null
      and tenant_id is null
    )
  );

-- Owning consultant only (or Super Admin) — this is what makes scope changes
-- only permitted by the owning consultant, since scope is just another
-- column an UPDATE can touch.
drop policy if exists workflow_templates_update_policy on public.workflow_templates;
create policy workflow_templates_update_policy on public.workflow_templates
  for update
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
  );
