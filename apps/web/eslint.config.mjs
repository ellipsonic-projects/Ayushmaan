import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
];
