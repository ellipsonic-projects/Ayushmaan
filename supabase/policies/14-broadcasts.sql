-- broadcasts (schema: Broadcast model) — a Super Admin-only platform
-- announcement log, same shape as grievances' "no tenant_id access
-- boundary" carve-out: this table has no tenant_id column at all, and only
-- SUPER_ADMIN ever reads or writes it (apps/api/src/routes/platform-notify.router.ts
-- requires that role at the route level already; this policy is the
-- defense-in-depth backstop per docs/api-patterns.md §1.11).

alter table public.broadcasts enable row level security;

drop policy if exists broadcast_super_admin_all on public.broadcasts;
create policy broadcast_super_admin_all on public.broadcasts
  for all
  using (current_setting('app.is_super_admin', true) = 'true')
  with check (current_setting('app.is_super_admin', true) = 'true');
