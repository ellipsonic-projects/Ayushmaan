-- Clients are platform-level, not tenant-specific (see CLAUDE.md change
-- log). Run this once against the dev DB *before* `pnpm db:push`, so the
-- columns are dropped explicitly rather than db push prompting to reset.
--
-- Data-preserving: no rows are merged or deleted. supabase_auth_user_id is
-- already globally unique and Supabase Auth enforces one auth account per
-- email, so no client today has more than one tenant-scoped profile — this
-- is purely a constraint relaxation.

alter table client_profiles drop column tenant_id;
alter table client_category_profiles drop column tenant_id;
alter table guardian_links drop column tenant_id;
update users set tenant_id = null where role = 'CLIENT';
