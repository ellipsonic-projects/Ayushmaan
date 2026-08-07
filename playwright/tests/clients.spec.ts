import { test, expect } from "@playwright/test";
import { loginAsClient } from "../support/login";
import { CLIENT_USER } from "../support/test-users";

// Smoke coverage for the CLIENT role: sign in, land on the client
// dashboard, and confirm every sidebar destination
// (components/tenant/client/sidebar.tsx) renders without error.
test.describe("CLIENT", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page, CLIENT_USER);
  });

  test("redirects to /client/dashboard after sign in", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/dashboard/);
  });

  const navPages = [
    "/client/dashboard",
    "/client/appointments",
    "/client/inbox",
    "/client/relationships",
    "/client/tasks",
    "/client/documentation",
    "/client/documents",
    "/client/notifications",
    "/client/settings",
  ];

  for (const path of navPages) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }
});
