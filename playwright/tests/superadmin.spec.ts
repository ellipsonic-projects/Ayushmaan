import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "../support/login";
import { SUPER_ADMIN_USER } from "../support/test-users";

// Smoke coverage for the SUPER_ADMIN role: sign in, land on the platform
// dashboard, and confirm every sidebar destination (components/platform-nav.tsx)
// renders without error. Tenant management itself gets its own deeper
// suite in tenants.spec.ts.
test.describe("SUPER_ADMIN", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page, SUPER_ADMIN_USER);
  });

  test("redirects to /superadmin/dashboard after sign in", async ({ page }) => {
    await expect(page).toHaveURL(/\/superadmin\/dashboard/);
  });

  const navPages = [
    "/superadmin/dashboard",
    "/superadmin/tenants",
    "/superadmin/payments",
    "/superadmin/audit-log",
    "/superadmin/grievances",
    "/superadmin/community-templates",
    "/superadmin/notify",
    "/superadmin/microservices",
  ];

  for (const path of navPages) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }
});
