import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/api/.env") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withTenantContext } from "../src/rls-context";

// Seeding is administrative, not request-serving — it must run as the table
// owner (postgres), never as the RLS-restricted app_user. See seed-tenant.ts
// for the full rationale.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Dev-only convenience seed: registers 3 clients against an existing tenant
// (see seed-tenant.ts) — a User row (role CLIENT) + ClientProfile in one
// transaction, mirroring seed-consultants.ts. There's no clients.router.ts
// POST handler (client accounts self-register via Supabase Auth), so this
// stands in for that flow. Run with:
//   pnpm --filter @ayushman/db exec tsx prisma/seed-client.ts
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.");
  }

  const tenantSlug = process.env.TENANT_SLUG ?? "shekhareyehospital";
  const clientPassword = process.env.CLIENT_PASSWORD ?? "HelloHelloHello123!";

  const clients: { email: string; fullName: string }[] = [
    { email: "client1@shekhar.com", fullName: "Ramesh Gupta" },
    { email: "client2@shekhar.com", fullName: "Sunita Sharma" },
    { email: "client3@shekhar.com", fullName: "Arjun Mehta" },
  ];

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const superAdminCtx = { tenantId: null, isSuperAdmin: true, userId: crypto.randomUUID() };

  const tenant = await withTenantContext(
    superAdminCtx,
    (tx) => tx.tenant.findUnique({ where: { slug: tenantSlug } }),
    prisma
  );
  if (!tenant) {
    throw new Error(`Tenant "${tenantSlug}" not found — run seed-tenant.ts first.`);
  }

  const tenantAdmin = await withTenantContext(
    superAdminCtx,
    (tx) => tx.user.findFirst({ where: { tenantId: tenant.id, role: "TENANT_ADMIN" } }),
    prisma
  );
  if (!tenantAdmin) {
    throw new Error(`No TENANT_ADMIN user found for tenant "${tenantSlug}".`);
  }

  // Clients are platform-level (no tenantId) — dedup/create runs with the
  // same elevated context used for the tenant lookup above, not a
  // tenant-scoped one, since a seeded client isn't tied to this tenant.
  for (const { email, fullName } of clients) {
    const existing = await withTenantContext(
      superAdminCtx,
      (tx) => tx.user.findFirst({ where: { role: "CLIENT", email } }),
      prisma
    );
    if (existing) {
      console.log(`Client "${email}" already exists, skipping.`);
      continue;
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: clientPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw new Error(`Failed to create Client auth user for ${email}: ${authError?.message}`);
    }

    const user = await withTenantContext(
      superAdminCtx,
      (tx) =>
        tx.user.create({
          data: {
            supabaseAuthUserId: authUser.user.id,
            role: "CLIENT",
            email,
            clientProfile: {
              create: {
                fullName,
              },
            },
          },
        }),
      prisma
    );

    console.log(`Client registered: ${user.email} / password: ${clientPassword}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
