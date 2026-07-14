import { config } from "dotenv";
import { defineConfig, env } from "@prisma/config";

// packages/db has no runtime secrets of its own — DATABASE_URL etc. live in
// apps/api's .env (the only app that talks to Postgres). Load that file
// explicitly so `prisma db push`/`migrate`/`db:seed` work when invoked from
// this package's own directory (e.g. `pnpm --filter @ayushman/db db:push`).
// .env.local only overrides keys it actually sets a non-empty value for —
// apps/api/.env.local carries several blank placeholder keys that would
// otherwise clobber the real values loaded from .env above.
config({ path: "../../apps/api/.env" });
const local = config({ path: "../../apps/api/.env.local" });
for (const [key, value] of Object.entries(local.parsed ?? {})) {
  if (value) process.env[key] = value;
}

// Prisma 7 moved the datasource URL and seed command out of schema.prisma /
// package.json's "prisma" field and into this file.
//
// Migrations run as the table owner (DDL privileges), deliberately separate
// from DATABASE_URL — which packages/db/src/client.ts uses for the
// request-serving connection and, per supabase/roles/app-role.sql, should
// be a non-owner role so RLS actually applies. Falls back to DATABASE_URL
// until that role migration has been done, so `db:push`/`migrate`/`db:seed`
// keep working unchanged in the meantime.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.MIGRATE_DATABASE_URL ?? env("DATABASE_URL"),
  },
});
