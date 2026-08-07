import { defineConfig, devices } from "@playwright/test";

// These tests exercise the real app against a real dev DB (see
// playwright/support/test-users.ts) — start `pnpm dev` yourself first
// (this config does not launch it) and make sure the seed-*.ts scripts
// under packages/db/prisma have been run.
export default defineConfig({
  testDir: "./playwright/tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
