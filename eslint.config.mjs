import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Shared base for everything that isn't apps/web (which layers Next's own
// config on top of this in its own eslint.config.mjs). ESLint's flat config
// resolves upward from cwd, so apps/api, packages/db, packages/types, and
// packages/shared all pick this up automatically via `eslint .` with no
// config file of their own.
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
