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
      "no-restricted-syntax": [
        "error",
        {
          selector:
            ":matches(ImportDeclaration[source.value='react']) > ImportSpecifier[imported.name='useEffect']",
          message:
            "Direct useEffect is not allowed. Use declarative state or useMountEffect for mount-only external synchronization.",
        },
        {
          selector:
            "MemberExpression[object.name='React'][property.name='useEffect']",
          message:
            "Direct React.useEffect is not allowed. Use declarative state or useMountEffect for mount-only external synchronization.",
        },
      ],
    },
  },
  {
    files: ["src/hooks/useMountEffect.ts"],
    rules: {
      "no-restricted-syntax": "off",
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
