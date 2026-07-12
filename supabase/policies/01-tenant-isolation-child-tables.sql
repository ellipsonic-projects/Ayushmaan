-- Four tables in schema_ayushman_v3.md §3 don't carry their own tenant_id
-- column (it would be redundant with their parent's) — task_reminders,
-- rag_citations, notification_preferences, push_subscriptions. Each gets a
-- tenant-isolation policy scoped through its parent's tenant_id instead of
-- a bare column comparison, since §4.1's generic policy shape assumes the
-- column exists directly on the table.

alter table public.task_reminders enable row level security;
drop policy if exists tenant_isolation on public.task_reminders;
create policy tenant_isolation on public.task_reminders
  for all
  using (
    exists (
      select 1 from public.tasks
       where tasks.id = task_reminders.task_id
         and tasks.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or current_setting('app.is_super_admin', true) = 'true'
  )
  with check (
    exists (
      select 1 from public.tasks
       where tasks.id = task_reminders.task_id
         and tasks.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or current_setting('app.is_super_admin', true) = 'true'
  );

alter table public.rag_citations enable row level security;
drop policy if exists tenant_isolation on public.rag_citations;
-- parent_type (schema §3.17) determines whether chat_message_id or
-- ai_summary_id is populated — exactly one of the two, per the model.
create policy tenant_isolation on public.rag_citations
  for all
  using (
    exists (
      select 1 from public.chat_messages
       where chat_messages.id = rag_citations.chat_message_id
         and chat_messages.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or exists (
      select 1 from public.ai_summaries
       where ai_summaries.id = rag_citations.ai_summary_id
         and ai_summaries.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or current_setting('app.is_super_admin', true) = 'true'
  )
  with check (
    exists (
      select 1 from public.chat_messages
       where chat_messages.id = rag_citations.chat_message_id
         and chat_messages.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or exists (
      select 1 from public.ai_summaries
       where ai_summaries.id = rag_citations.ai_summary_id
         and ai_summaries.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    or current_setting('app.is_super_admin', true) = 'true'
  );

alter table public.notification_preferences enable row level security;
drop policy if exists tenant_isolation on public.notification_preferences;
create policy tenant_isolation on public.notification_preferences
  for all
  using (
    exists (
      select 1 from public.users
       where users.id = notification_preferences.user_id
         and (
           users.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
           or current_setting('app.is_super_admin', true) = 'true'
         )
    )
  )
  with check (
    exists (
      select 1 from public.users
       where users.id = notification_preferences.user_id
         and (
           users.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
           or current_setting('app.is_super_admin', true) = 'true'
         )
    )
  );

alter table public.push_subscriptions enable row level security;
drop policy if exists tenant_isolation on public.push_subscriptions;
create policy tenant_isolation on public.push_subscriptions
  for all
  using (
    exists (
      select 1 from public.users
       where users.id = push_subscriptions.user_id
         and (
           users.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
           or current_setting('app.is_super_admin', true) = 'true'
         )
    )
  )
  with check (
    exists (
      select 1 from public.users
       where users.id = push_subscriptions.user_id
         and (
           users.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
           or current_setting('app.is_super_admin', true) = 'true'
         )
    )
  );
