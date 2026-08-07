// Credentials for accounts created by packages/db/prisma/seed-*.ts.
// Run those seed scripts against your dev DB before running these tests —
// see docs comments in each seed-*.ts for exact commands. Defaults below
// match seed-tenant.ts / seed-client.ts's own fallback values; SUPER_ADMIN
// has no default (seed-superadmin.ts requires it to be set explicitly, and
// the account must be email-confirmed before password sign-in will work).

export const TENANT_SLUG = process.env.TENANT_SLUG ?? "shekhareyehospital";

export const CLIENT_USER = {
  email: process.env.CLIENT_EMAIL ?? "client1@shekhar.com",
  password: process.env.CLIENT_PASSWORD ?? "HelloHelloHello123!",
};

export const TENANT_ADMIN_USER = {
  email: process.env.TENANT_ADMIN_EMAIL ?? "admin@shekhar.com",
  password: process.env.TENANT_ADMIN_PASSWORD ?? "HelloHelloHello123!",
  slug: TENANT_SLUG,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. SUPER_ADMIN tests need SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD ` +
        `for an account already seeded via seed-superadmin.ts and confirmed in Supabase.`
    );
  }
  return value;
}

export const SUPER_ADMIN_USER = {
  get email() {
    return requireEnv("SUPER_ADMIN_EMAIL");
  },
  get password() {
    return requireEnv("SUPER_ADMIN_PASSWORD");
  },
};
