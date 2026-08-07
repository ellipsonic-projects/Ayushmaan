import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "../support/login";
import { SUPER_ADMIN_USER, TENANT_SLUG } from "../support/test-users";

// Deeper coverage for the Super Admin's tenant management feature
// (app/(platform)/(superadmin)/superadmin/tenants) beyond the plain smoke
// pass in superadmin.spec.ts: the tenants list renders the seeded tenant,
// and drilling into it exposes the Overview/Consultants/Clients/Cases
// sub-nav (components/tenant/admin/nav.tsx's SuperAdminTenantNav).
test.describe("SUPER_ADMIN tenant management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page, SUPER_ADMIN_USER);
    await page.goto("/superadmin/tenants");
  });

  test("lists the seeded tenant", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
    await expect(page.getByText(TENANT_SLUG)).toBeVisible();
  });

  test("drills into a tenant and loads its sub-nav pages", async ({ page }) => {
    const tenantLink = page.locator('a[href^="/superadmin/tenants/"]').first();
    await expect(tenantLink).toBeVisible();
    const href = await tenantLink.getAttribute("href");
    const tenantId = href!.split("/").pop();

    await tenantLink.click();
    await expect(page).toHaveURL(`/superadmin/tenants/${tenantId}`);
    await expect(page.locator("body")).not.toContainText("Application error");

    for (const path of ["consultants", "clients", "cases"]) {
      const url = `/superadmin/tenants/${tenantId}/${path}`;
      await page.goto(url);
      await expect(page).toHaveURL(url);
      await expect(page.locator("body")).not.toContainText("Application error");
    }
  });
});
