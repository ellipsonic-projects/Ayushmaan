import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Integration tests share one live DB connection pool — run sequentially
    // to avoid one test's fixtures/cleanup racing another's.
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
  },
});
