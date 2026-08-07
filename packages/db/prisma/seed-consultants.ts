import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/api/.env") });
import { PrismaClient, ConsultantCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withTenantContext } from "../src/rls-context";

// Seeding is administrative, not request-serving — it must run as the table
// owner (postgres), never as the RLS-restricted app_user. See seed-tenant.ts
// for the full rationale.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Dev-only convenience seed: registers 3 consultants against an existing
// tenant (see seed-tenant.ts), the way consultants.router.ts's POST handler
// does — a User row (role CONSULTANT) + ConsultantProfile in one transaction,
// invitedBy set to that tenant's TENANT_ADMIN. Run with:
//   pnpm --filter @ayushman/db exec tsx prisma/seed-consultants.ts
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.");
  }

  const tenantSlug = process.env.TENANT_SLUG ?? "shekhareyehospital";
  const consultantPassword = process.env.CONSULTANT_PASSWORD ?? "HelloHelloHello123!";

  const consultants: {
    email: string;
    fullName: string;
    phone: string;
    category: ConsultantCategory;
  }[] = [
    {
      email: "consultant1@shekhar.com",
      fullName: "Dr. Anita Rao",
      phone: "+919652770457",
      category: "MEDICAL",
    },
    {
      email: "consultant2@shekhar.com",
      fullName: "Dr. Vikram Singh",
      phone: "+919652770458",
      category: "MEDICAL",
    },
    {
      email: "consultant3@shekhar.com",
      fullName: "Dr. Priya Nair",
      phone: "+919652770459",
      category: "MEDICAL",
    },
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

  const tenantCtx = { tenantId: tenant.id, isSuperAdmin: false, userId: tenantAdmin.id };

  for (const { email, fullName, phone, category } of consultants) {
    const existing = await withTenantContext(
      tenantCtx,
      (tx) => tx.user.findFirst({ where: { tenantId: tenant.id, email } }),
      prisma
    );
    if (existing) {
      console.log(`Consultant "${email}" already exists, skipping.`);
      continue;
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: consultantPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw new Error(`Failed to create Consultant auth user for ${email}: ${authError?.message}`);
    }

    const user = await withTenantContext(
      tenantCtx,
      (tx) =>
        tx.user.create({
          data: {
            supabaseAuthUserId: authUser.user.id,
            tenantId: tenant.id,
            role: "CONSULTANT",
            email,
            phone,
            consultantProfile: {
              create: {
                tenantId: tenant.id,
                invitedBy: tenantAdmin.id,
                fullName,
                category,
              },
            },
          },
        }),
      prisma
    );

    console.log(`Consultant registered: ${user.email} / password: ${consultantPassword}`);
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
