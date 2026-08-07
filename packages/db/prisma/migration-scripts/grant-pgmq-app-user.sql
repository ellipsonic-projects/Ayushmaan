-- apps/api/src/queue/pgmq.ts calls pgmq.send/read/delete/archive through the
-- request-serving Prisma client, which connects as `app_user` (DATABASE_URL) —
-- a non-owner role, deliberately separate from the migration role
-- (MIGRATE_DATABASE_URL) per supabase/roles/app-role.sql so RLS actually
-- applies to every other table. pgmq's objects are owned by the migration
-- role and grant nothing to app_user by default, so without this, every
-- queue call fails with "permission denied for schema pgmq" at runtime.
-- Run this once against the dev/prod DB with the migration role, same as
-- enable-pgmq.sql (e.g. `psql "$MIGRATE_DATABASE_URL" -f
-- prisma/migration-scripts/grant-pgmq-app-user.sql`), after enable-pgmq.sql
-- has created the `workflow-advance` queue.

grant usage on schema pgmq to app_user;
grant execute on all functions in schema pgmq to app_user;
alter default privileges in schema pgmq grant execute on functions to app_user;

grant select, insert, update, delete on all tables in schema pgmq to app_user;
alter default privileges in schema pgmq grant select, insert, update, delete on tables to app_user;
