-- Sprint 5.5.4 item 1 — enables Supabase's `pgmq` extension and creates the
-- single queue the workflow execution engine uses (apps/api/src/queue/pgmq.ts).
-- No Redis, no separate queue service: this runs on the Postgres already
-- provisioned. Run this once against the dev/prod DB (e.g.
-- `psql "$DATABASE_URL" -f packages/db/prisma/migration-scripts/enable-pgmq.sql`),
-- or via the Supabase dashboard's Database → Extensions UI instead — either
-- is fine, this file just makes it a tracked, repeatable step.

create extension if not exists pgmq;

select pgmq.create('workflow-advance');
