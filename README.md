# TanStack Start + shadcn/ui

This is a template for a new TanStack Start project with React, TypeScript, and shadcn/ui.

## Convex

Install dependencies, then create or connect a Convex development deployment:

```bash
corepack pnpm install
corepack pnpm convex:dev
```

The Convex CLI creates `.env.local` with `CONVEX_DEPLOYMENT` and
`VITE_CONVEX_URL`, generates the `convex/_generated` API types, and keeps the
backend in sync while it is running.

In a second terminal, start the TanStack app:

```bash
corepack pnpm dev
```

Use `convexQuery` with TanStack Query to read Convex data:

```tsx
import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"

const { data } = useSuspenseQuery(convexQuery(api.messages.list, {}))
```

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
- [] Fix the weird CHat UI scroll using T3code browser view
