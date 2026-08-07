import { expect, type Page } from "@playwright/test";

// SignInForm (components/auth/signin-form.tsx) is shared by /signin (no
// tenantSlug) and /{slug}/tenant/auth (tenantSlug set) — same #identifier /
// #password fields and "Sign in" button either way, so one helper covers
// both entry points.
export async function loginWithPassword(
  page: Page,
  {
    email,
    password,
    signInPath = "/signin",
  }: { email: string; password: string; signInPath?: string }
) {
  await page.goto(signInPath);
  await page.locator("#identifier").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function loginAsClient(page: Page, user: { email: string; password: string }) {
  await loginWithPassword(page, { ...user, signInPath: "/signin" });
  await expect(page).toHaveURL(/\/client\/dashboard/, { timeout: 15_000 });
}

export async function loginAsSuperAdmin(page: Page, user: { email: string; password: string }) {
  await loginWithPassword(page, { ...user, signInPath: "/signin" });
  await expect(page).toHaveURL(/\/superadmin\/dashboard/, { timeout: 15_000 });
}

export async function loginAsTenantAdmin(
  page: Page,
  user: { email: string; password: string; slug: string }
) {
  await loginWithPassword(page, { ...user, signInPath: `/${user.slug}/tenant/auth` });
  await expect(page).toHaveURL(new RegExp(`/${user.slug}/tenant/admin/dashboard`), {
    timeout: 15_000,
  });
}
