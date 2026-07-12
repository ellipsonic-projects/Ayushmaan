import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { E164_PHONE_REGEX } from "@ayushman/shared/constants";

// Seeding is administrative, not request-serving — it must run as the table
// owner (postgres), never as the RLS-restricted app_user that packages/db/
// src/client.ts's shared singleton connects as (supabase/roles/app-role.sql's
// own comment: "Migrations/db:push/seed can keep using the owner (postgres)
// connection — only the request-serving connection pool needs to switch").
// Prisma's transaction engine is also denied outright as app_user over
// Supabase's pooler, independent of RLS/grants.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Super Admin accounts are seeded out-of-band, never via a self-serve endpoint
// (data_api_v3.md §4.2). Run with: pnpm --filter @ayushman/api db:seed
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const phone = process.env.SUPER_ADMIN_PHONE;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !password || !phone) {
    throw new Error(
      "Set SUPER_ADMIN_EMAIL , SUPER_ADMIN_PASSWORD, SUPER_ADMIN_PHONE in apps/api/.env before seeding."
    );
  }

  if (!E164_PHONE_REGEX.test(phone)) {
    throw new Error(
      `SUPER_ADMIN_PHONE must be in E.164 format (e.g. +919652770456), got "${phone}".`
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await prisma.user.findFirst({
    where: { email, role: "SUPER_ADMIN" },
  });
  if (existing) {
    console.log(`Super Admin already exists for ${email}, skipping.`);
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    phone,
    email_confirm: false,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create Supabase Auth user: ${error?.message}`);
  }

  await prisma.user.create({
    data: {
      supabaseAuthUserId: data.user.id,
      email,
      phone,
      role: "SUPER_ADMIN",
      tenantId: null,
    },
  });

  // Account was created with email_confirm: false, so send a magic link via
  // Supabase's own mailer to verify the address (admin.createUser doesn't
  // send anything itself, and admin.generateLink only returns a link without
  // dispatching it — signInWithOtp is what actually triggers the email).
  // emailRedirectTo must be set explicitly here — there's no window.location
  // to infer it from server-side, and without it Supabase falls back to the
  // project's default Site URL instead of apps/web's /auth/callback route
  // that actually knows how to resolve a role and redirect.
  const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
  const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${webAppUrl}/auth/callback`,
    },
  });
  if (otpError) {
    throw new Error(`Failed to send verification email: ${otpError.message}`);
  }

  console.log(`Super Admin created: ${email}`);
  console.log(`Verification magic link sent to ${email} — check inbox to confirm.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
