import { test, expect } from "@playwright/test";
import { loginAsTenantAdmin } from "../support/login";
import { TENANT_ADMIN_USER } from "../support/test-users";

// Smoke coverage for the TENANT_ADMIN role: sign in via the tenant-scoped
// auth page, land on that tenant's admin dashboard, and confirm every
// sidebar destination (components/tenant/admin/nav.tsx, basePath
// "/tenant/admin") renders without error.
test.describe("TENANT_ADMIN", () => {
  const slug = TENANT_ADMIN_USER.slug;

  test.beforeEach(async ({ page }) => {
    await loginAsTenantAdmin(page, TENANT_ADMIN_USER);
  });

  test(`redirects to /${slug}/tenant/admin/dashboard after sign in`, async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/${slug}/tenant/admin/dashboard`));
  });

  const navPaths = [
    "dashboard",
    "audit-log",
    "appointments",
    "billing",
    "calendar",
    "consultants",
    "consultant-applications",
    "contacts",
    "grievance",
    "inbox",
    "scheduler",
    "templates",
    "workflows",
    "notifications",
    "settings",
  ];

  for (const path of navPaths) {
    test(`loads /tenant/admin/${path}`, async ({ page }) => {
      const url = `/${slug}/tenant/admin/${path}`;
      await page.goto(url);
      await expect(page).toHaveURL(url);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }
});
