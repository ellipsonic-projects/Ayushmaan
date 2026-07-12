import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";

// Prerequisites for this test to mean anything (docs/sprints_v3.md Sprint
// 0.3.6): supabase/policies/*.sql applied to the target database, and
// DATABASE_URL pointed at the non-owner `app_user` role from
// supabase/roles/app-role.sql. A superuser/table-owner connection bypasses
// RLS unconditionally, which the guard in beforeAll below turns into a
// hard failure instead of a false-positive pass.

describe("RLS tenant isolation", () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;

  const superAdmin = { tenantId: null, isSuperAdmin: true, userId: randomUUID() };

  beforeAll(async () => {
    // Table *ownership* bypasses RLS, independent of rolsuper — Supabase's
    // pooled "postgres" role isn't flagged rolsuper in managed Postgres, but
    // it does own every table Prisma migrations created, which bypasses RLS
    // exactly the same way. Check both, or this guard misses the real case.
    const [{ rolsuper, rolbypassrls }] = await prisma.$queryRaw<
      { rolsuper: boolean; rolbypassrls: boolean }[]
    >`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
    const [{ is_owner }] = await prisma.$queryRaw<{ is_owner: boolean }[]>`
      select (tableowner = current_user) as is_owner
        from pg_tables
       where schemaname = 'public' and tablename = 'users'
    `;
    if (rolsuper || rolbypassrls || is_owner) {
      throw new Error(
        "DATABASE_URL is connected as a superuser/table-owner/BYPASSRLS role, which " +
          "bypasses Row-Level Security unconditionally — this test cannot validate " +
          "anything over this connection. Run supabase/roles/app-role.sql and point " +
          "DATABASE_URL at app_user (see .env.example) before running this suite."
      );
    }

    const suffix = Date.now();
    const tenantA = await withTenantContext(superAdmin, (tx) =>
      tx.tenant.create({
        data: { slug: `rls-test-a-${suffix}`, displayName: "RLS Test Tenant A" },
      })
    );
    const tenantB = await withTenantContext(superAdmin, (tx) =>
      tx.tenant.create({
        data: { slug: `rls-test-b-${suffix}`, displayName: "RLS Test Tenant B" },
      })
    );
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const userA = await withTenantContext(
      { tenantId: tenantAId, isSuperAdmin: false, userId: randomUUID() },
      (tx) =>
        tx.user.create({
          data: {
            supabaseAuthUserId: randomUUID(),
            tenantId: tenantAId,
            role: "CONSULTANT",
            email: `rls-test-a-${suffix}@example.com`,
          },
        })
    );
    userAId = userA.id;
  });

  afterAll(async () => {
    if (!tenantAId || !tenantBId) return; // beforeAll bailed before creating fixtures
    await withTenantContext(superAdmin, async (tx) => {
      await tx.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
  });

  it("lets a tenant read its own row", async () => {
    const rows = await withTenantContext(
      { tenantId: tenantAId, isSuperAdmin: false, userId: randomUUID() },
      (tx) => tx.user.findMany({ where: { id: userAId } })
    );
    expect(rows).toHaveLength(1);
  });

  it("blocks a different tenant from reading the row", async () => {
    const rows = await withTenantContext(
      { tenantId: tenantBId, isSuperAdmin: false, userId: randomUUID() },
      (tx) => tx.user.findMany({ where: { id: userAId } })
    );
    expect(rows).toHaveLength(0);
  });

  it("lets a super admin read across tenants", async () => {
    const rows = await withTenantContext(superAdmin, (tx) =>
      tx.user.findMany({ where: { id: userAId } })
    );
    expect(rows).toHaveLength(1);
  });
});
