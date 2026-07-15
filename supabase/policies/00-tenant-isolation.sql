-- Standard tenant-scoped policy (schema_ayushman_v3.md §4.1), applied to
-- every table that carries its own tenant_id column. app.tenant_id and
-- app.is_super_admin are set once per request, inside the request's DB
-- transaction, via SET LOCAL by apps/api's tenant-scoping middleware
-- (packages/db/src/rls-context.ts's withTenantContext) — never by anything
-- a client can influence directly.
--
-- `tenants` and `grievances` are handled by their own policy files (they
-- don't follow this generic shape); task_reminders, rag_citations,
-- notification_preferences and push_subscriptions don't carry their own
-- tenant_id column and are handled in 01-tenant-isolation-child-tables.sql.

do $$
declare
  t text;
  tables text[] := array[
    'tenant_settings',
    'tenant_billing',
    'users',
    'client_profiles',
    'client_category_profiles',
    'guardian_links',
    'consultant_profiles',
    'consultant_verification_documents',
    'availability_slots',
    'out_of_office_periods',
    'cases',
    'appointment_series',
    'appointments',
    'interactions',
    'commitment_templates',
    'commitments',
    'tasks',
    'documents',
    'chat_messages',
    'ai_summaries',
    'reviews',
    'consultant_analytics_snapshot',
    'referrals',
    'consultant_referrals',
    'notifications',
    'audit_logs',
    'payments',
    'contacts'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format($f$
      create policy tenant_isolation on public.%I
        for all
        using (
          tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
          or current_setting('app.is_super_admin', true) = 'true'
        )
        with check (
          tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
          or current_setting('app.is_super_admin', true) = 'true'
        );
    $f$, t);
  end loop;
end $$;
