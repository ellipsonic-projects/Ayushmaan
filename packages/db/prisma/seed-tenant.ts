import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/api/.env") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withTenantContext } from "../src/rls-context";

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

// Dev-only convenience seed: registers one tenant the way Sprint 1.1's
// tenants.router.ts is specified to (schema §6 Migration Strategy / PRD
// Phase 1 goal) — tenants + tenant_settings + tenant_billing + a default
// TENANT_ADMIN users row, all in one transaction. That router doesn't exist
// yet, so this stands in for it. Every value has a dummy default so this
// runs with zero env vars; override any of them to register a specific
// tenant. Run with:
//   pnpm --filter @ayushman/db exec tsx prisma/seed-tenant.ts
async function main() {
  const env = (key: string, fallback: string): string => process.env[key] ?? fallback;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.");
  }

  const tenantSlug = env("TENANT_SLUG", "shekhareyehospital");
  const tenantName = env("TENANT_NAME", "Shekhar Eye Hospital");
  const planTier = env("TENANT_PLAN_TIER", "STANDARD");
  const logoUrl = process.env.TENANT_LOGO_URL; // optional — tenants.logo_url is nullable
  const customDomain = process.env.TENANT_CUSTOM_DOMAIN; // optional — tenants.custom_domain is nullable

  const defaultCurrency = env("TENANT_CURRENCY", "INR");
  const payoutCycle = env("TENANT_PAYOUT_CYCLE", "WEEKLY"); // WEEKLY | BIWEEKLY | MONTHLY
  const bookingCutoffHours = Number(env("TENANT_BOOKING_CUTOFF_HOURS", "2"));

  const billingPlanName = env("TENANT_BILLING_PLAN_NAME", "Standard Monthly");

  const adminEmail = env("TENANT_ADMIN_EMAIL", "admin@shekhar.com");
  const adminPassword = env("TENANT_ADMIN_PASSWORD", "HelloHelloHello123!");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const superAdminCtx = { tenantId: null, isSuperAdmin: true, userId: crypto.randomUUID() };

  const existing = await withTenantContext(
    superAdminCtx,
    (tx) => tx.tenant.findUnique({ where: { slug: tenantSlug } }),
    prisma
  );
  if (existing) {
    console.log(`Tenant "${tenantSlug}" already exists (${existing.id}), skipping.`);
    return;
  }

  const { tenant, admin } = await withTenantContext(
    superAdminCtx,
    async (tx) => {
      const tenant = await tx.tenant.create({
        data: { slug: tenantSlug, displayName: tenantName, planTier, logoUrl, customDomain },
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          defaultCurrency,
          payoutCycle: payoutCycle as never,
          bookingCutoffHours,
        },
      });

      await tx.tenantBilling.create({
        data: { tenantId: tenant.id, planName: billingPlanName },
      });

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      if (authError || !authUser.user) {
        throw new Error(`Failed to create Tenant Admin auth user: ${authError?.message}`);
      }

      const admin = await tx.user.create({
        data: {
          supabaseAuthUserId: authUser.user.id,
          tenantId: tenant.id,
          role: "TENANT_ADMIN",
          email: adminEmail,
        },
      });

      return { tenant, admin };
    },
    prisma
  );

  console.log(`Tenant registered: ${tenant.slug} (${tenant.id})`);
  console.log(`Tenant Admin: ${admin.email} / password: ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
