//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
      // useEffect is a judgement call, not a lint error: see
      // .agents/skills/frontend/use-effect. Derive during render or reach for
      // useMountEffect first; a raw useEffect needs a comment saying why.
    },
  },
  {
    ignores: [
      "eslint.config.js",
      ".prettierrc",
      "convex/_generated/**",
      "dist/**",
    ],
  },
]
