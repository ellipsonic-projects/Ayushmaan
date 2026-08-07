-- Intake-form templates get the same scope-gated policy shape as
-- workflow_templates (11-workflow-templates.sql) rather than the standard
-- tenant_isolation policy — visibility is gated by form_templates.scope,
-- not tenant_id alone.

alter table public.form_templates enable row level security;

drop policy if exists form_templates_scope_policy on public.form_templates;
create policy form_templates_scope_policy on public.form_templates
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

-- A CLIENT reading their own submitted form (GET .../form-submissions,
-- apps/api's form-submissions.router.ts) needs the template's name/schema to
-- render it, even when the template is PERSONAL-scope (the normal case for
-- a consultant's own intake forms) — none of the branches above cover that.
-- Same client-self-read shape as cases/appointments/documents in
-- 06-client-platform-self-read.sql: visible only if the client has an
-- actual form_submissions row referencing it through one of their own cases.
drop policy if exists client_platform_self_read on public.form_templates;
create policy client_platform_self_read on public.form_templates
  for select
  using (
    exists (
      select 1
      from public.form_submissions fs
      join public.cases c on c.id = fs.case_id
      where fs.form_template_id = form_templates.id
        and c.client_id = public.current_client_profile_id()
    )
  );

drop policy if exists form_templates_write_policy on public.form_templates;
create policy form_templates_write_policy on public.form_templates
  for insert
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
  );

drop policy if exists form_templates_update_policy on public.form_templates;
create policy form_templates_update_policy on public.form_templates
  for update
  using (
    current_setting('app.is_super_admin', true) = 'true'
    or consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
  )
  with check (
    current_setting('app.is_super_admin', true) = 'true'
    or consultant_id = nullif(current_setting('app.consultant_id', true), '')::uuid
  );
