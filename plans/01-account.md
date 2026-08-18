# Phase 1 — Account settings backend

The Account page UI is complete and static. This plan covers every clickable or displayed control on `/settings` (the Account tab) plus the shared settings rail, and the Convex / Clerk / Polar work needed to make them real.

## Current state

| Area | Today |
| --- | --- |
| Auth | Clerk. Convex `ownerId` is `identity.tokenIdentifier`. There is **no** `users` table. |
| Billing | None. No Polar, Stripe, or Clerk Billing. |
| Plans | `SETTINGS_PLANS` and `SETTINGS_USAGE` in `src/components/settings/constants.ts` are hardcoded (`currentPlanId: "pro"`, `baseRemainingLabel: "3h 20m"`, `renewsOnLabel: "Aug 22, 2026"`). |
| Preferences | `preferences` table only stores selected model, favorites, and `combineResults`. |
| Chat quota | `/api/chat` and `chatRuns.start` do not check a plan or remaining usage. Thread message cap is the only limit. |
| Delete account | `user.delete()` (Clerk) only. Threads, messages, runs, attachments, and R2 objects stay. |
| Email / devices | `clerk.openUserProfile()` — keep this; no Convex work. |
| Theme / sign out | Client-only / Clerk — already works. |

## Clickable inventory (Account + shared chrome)

### Already real — no backend

| Control | Behavior |
| --- | --- |
| Back to Chat | Link to `/` |
| Theme toggle | `preferences-store` + localStorage |
| Sign out | `clerk.signOut` |
| Settings tabs | Account is real; others are placeholders |
| Change Email | Clerk user profile |
| View Devices | Clerk user profile |
| Keyboard shortcut list | Static display |
| Customize shortcuts | Navigates to `/settings/shortcuts` (placeholder until that phase) |
| Usage info tooltip | Static copy |

### Needs backend (this phase)

| Control | File | Required work |
| --- | --- | --- |
| Plan badge ("Pro Plan") | `SettingsRail.tsx`, `SidebarAccount.tsx` | Live plan from billing account |
| Base usage bar + remaining time | `SettingsRail.tsx` | Live remaining base quota |
| Burst overage bar | `SettingsRail.tsx` | Live burst used / cap |
| "Plan renews on …" | `SettingsRail.tsx` | Period end from Polar (or free-plan refill instant) |
| Manage Billing & Invoices | `AccountSettings.tsx` | Polar customer portal URL |
| Upgrade / Downgrade / Current Plan | `AccountSettings.tsx` | Polar checkout / portal; disable current plan |
| Email me receipts | `AccountSettings.tsx` | Persist boolean; apply to Polar/Stripe customer |
| Delete Account | `AccountSettings.tsx` | Wipe Convex + R2, then Clerk `user.delete()` |

## Billing provider

**Use Polar** (`@convex-dev/polar`) plus a Convex `billingAccounts` row.

Why Polar, not Clerk Billing:

- T3 Chat uses Polar for checkout, invoices, and the customer portal.
- Convex ships an official Polar component; Clerk Billing is still experimental.
- Email/devices stay on Clerk. Polar only owns money.

Map Polar customers to Clerk with a stable key: `identity.subject` (Clerk `user_…`) stored on `billingAccounts.clerkUserId`, plus `ownerId` = `tokenIdentifier` for every other table.

Configure three Polar products that match the existing cards:

| Plan id | UI price | Polar product |
| --- | --- | --- |
| `free` | $0 | No Polar subscription (default when no active sub) |
| `pro` | $8 / month | Polar product `pro` |
| `premier` | $50 / month | Polar product `premier` |

Keep `SETTINGS_PLANS` as the UI catalog. Polar slugs must match `PlanId`. Do not replace the custom cards with Polar's hosted pricing table.

## Schema

No migration of existing fields. New tables only. Optional fields on new docs so older deploys cannot break.

```ts
// convex/schema.ts (add)

billingAccounts: defineTable({
  ownerId: v.string(),
  clerkUserId: v.string(),
  planId: v.union(v.literal("free"), v.literal("pro"), v.literal("premier")),
  polarCustomerId: v.optional(v.string()),
  polarSubscriptionId: v.optional(v.string()),
  status: v.union(
    v.literal("none"),
    v.literal("active"),
    v.literal("past_due"),
    v.literal("canceled"),
  ),
  currentPeriodEnd: v.optional(v.number()),
  emailReceipts: v.boolean(),
  cancelAtPeriodEnd: v.optional(v.boolean()),
})
  .index("by_ownerId", ["ownerId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_polarCustomerId", ["polarCustomerId"]),

usageCounters: defineTable({
  ownerId: v.string(),
  periodStart: v.number(),
  periodEnd: v.number(),
  baseUsedMs: v.number(),
  burstUsedMs: v.number(),
})
  .index("by_ownerId_and_periodStart", ["ownerId", "periodStart"]),

usageEvents: defineTable({
  ownerId: v.string(),
  runId: v.string(),
  threadId: v.id("threads"),
  modelId: v.string(),
  durationMs: v.number(),
  outputTokens: v.number(),
  bucket: v.union(v.literal("base"), v.literal("burst")),
  createdAt: v.number(),
})
  .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"])
  .index("by_runId", ["runId"]),
```

Why two usage tables:

- `usageCounters` is the document the settings rail reads (one row per owner per period). Update it in the **same mutation** that completes a chat run so the meter cannot drift.
- `usageEvents` is an audit log. Do not `.collect()` it on the settings page. Cap reads with the owner+time index if we ever show a usage breakdown.

Do **not** put `baseUsedMs` on `billingAccounts`. Completing a run is high-churn; plan/status is not.

Quota numbers live in `convex/billingConstants.ts` (not in components):

```ts
export const PLAN_QUOTAS = {
  free: { baseMs: 30 * 60_000, burstMs: 0 },
  pro: { baseMs: 4 * 60 * 60_000, burstMs: 2 * 60 * 60_000 },
  premier: { baseMs: 40 * 60 * 60_000, burstMs: 10 * 60 * 60_000 },
} as const
```

Tune the hours against real model cost later. The UI already speaks in hours/minutes (`3h 13m`).

Period: calendar month from Polar `currentPeriodEnd` for paid plans. Free plan: a rolling 24h window advanced by a scheduled mutation (do not call `Date.now()` inside the usage **query** — pass `now` from the client, or store `periodEnd` on the counter row).

## Convex functions

All public functions: `authedQuery` / `authedMutation`, `args` + `returns` validators, derive identity from `ctx.auth` (never take `userId` from the client).

### Read

- `billing.getAccount`
  - Returns `{ planId, planLabel, status, currentPeriodEnd, emailReceipts, usage: { baseUsedMs, baseLimitMs, burstUsedMs, burstLimitMs, baseRemainingMs } }`
  - Missing row → treat as free, zero usage, `emailReceipts: true`
  - Client formats remaining as `3h 13m` and bar percents. Keep that formatting in `src/components/settings/logic.ts` (extend existing helpers, do not inline in the rail).

### Write

- `billing.setEmailReceipts({ enabled })` — patch `emailReceipts`. If a Polar customer exists, schedule an internal action to update Polar/Stripe invoice emails. If Polar has no such API, persist locally and only send app-generated receipts (none today).
- `billing.createCheckout({ planId })` — action, `"use node"` in `convex/billingActions.ts`. Creates Polar checkout for `pro` or `premier`. Returns `{ url }`. Reject if `planId === current` or `planId === "free"` (free is "no subscription").
- `billing.createPortalSession` — action. Returns Polar customer portal URL (invoices, payment method, cancel). Powers **Manage Billing & Invoices** and paid-plan **Downgrade**.
- Polar webhook HTTP handler in `convex/http.ts` → `internal.billing.applyPolarEvent`. On subscription active/updated/canceled, upsert `billingAccounts` by `clerkUserId`. Never trust the client for `planId`.

### Chat gating (required for the meters to mean anything)

In `chatRuns.start` (same mutation that accepts a run):

1. Load `billingAccounts` + current `usageCounters`.
2. If `baseUsedMs + burstUsedMs >= baseLimit + burstLimit`, throw a clear error (`"Usage limit reached. Upgrade or wait until the plan renews."`).
3. Do **not** check wall-clock with `Date.now()` inside a query. The start mutation may use `Date.now()` to roll the period if `periodEnd` has passed, then insert a fresh counter row.

When a run completes (`chatRuns.complete` / persist generation):

1. Insert `usageEvents` (dedupe on `by_runId`).
2. Add `durationMs` to `baseUsedMs` until the base cap, then to `burstUsedMs`.
3. Same mutation as the message patch so the rail and the chat cannot disagree.

`/api/chat` should catch the quota `ConvexError` and return HTTP 429 with that message.

Model-set gating (Free = "select models", Pro = "all models") can wait until the Models tab. For Phase 1, quota is enough.

### Account deletion

Replace "Clerk delete only" with:

1. Client confirms (keep the existing `window.confirm` or upgrade later).
2. `accounts.scheduleDelete` mutation:
   - Verify auth.
   - Schedule `internal.accounts.deleteOwnerBatch({ ownerId })`.
   - Return immediately.
3. `deleteOwnerBatch` walks, in batches of ~64:
   - threads in `deleting` (reuse `threads.deleteBatch`)
   - leftover `chatRuns`, `attachments` + R2, `preferences`, `usageEvents`, `usageCounters`, `billingAccounts`
   - cancel Polar subscription if present
4. After Convex data is gone, an action calls Clerk Backend API `users.deleteUser(clerkUserId)` **or** the client still calls `user.delete()` after the mutation succeeds.

Safer order: **Convex wipe first**, then Clerk. Add a Clerk `user.deleted` webhook that runs the same batch if someone deletes the user from the Clerk dashboard.

Do not `.collect()` a user's threads. Use the existing owner indexes and `THREAD_DELETE_BATCH_SIZE`.

## Frontend wiring (Account UI)

Keep the existing layout and cards. Do not redesign.

| Change | Where |
| --- | --- |
| Replace `SETTINGS_USAGE` reads with `useQuery(api.billing.getAccount)` | `SettingsRail`, `AccountSettings`, `SidebarAccount` |
| Format remaining ms → `3h 13m` and percents | new helpers in `logic.ts` + tests in `logic.test.ts` |
| `Manage Billing & Invoices` | `window.location` to portal URL (or disable with tooltip on free) |
| Plan buttons | `upgrade` → checkout URL; `downgrade` → portal (or confirm + Polar cancel/switch); `current` stays disabled |
| Email receipts switch | `useMutation(api.billing.setEmailReceipts)` instead of `useState(true)` |
| Delete | call `scheduleDelete`, then Clerk `user.delete()`, then navigate to `/` |
| Loading | reuse `SettingsBodySkeleton` patterns; do not flash "Free" then "Pro" |
| Errors | toast on checkout/portal/delete failure |

Guest users never see `/settings` (route already redirects). No guest billing.

## Polar / Clerk dashboard setup (not code)

- Enable Polar sandbox; create `pro` and `premier` monthly products.
- Set Polar webhook secret in Convex env (`POLAR_WEBHOOK_SECRET`, `POLAR_ACCESS_TOKEN`).
- Success/cancel URLs: `/settings` and `/settings?checkout=cancel`.
- Clerk webhook for `user.deleted` (and optionally `user.created` to pre-insert a free `billingAccounts` row).

## Tests

- `getPlanAction` already exists. Add `formatUsageRemaining` / percent helpers.
- Convex: `billing.getAccount` defaults; period roll; quota rejection in `chatRuns.start`; usage applied once per `runId`.
- Do not hit Polar in unit tests — stub the action.

## Implementation order

1. Schema + constants + `billing.getAccount` (UI can switch off hardcoded `SETTINGS_USAGE`).
2. Polar component + checkout/portal + webhook → real plan badge and buttons.
3. Usage counters hooked to run completion + gate `chatRuns.start`.
4. Email receipts mutation.
5. Account delete cascade + Clerk webhook.

## Out of scope for Phase 1

- Customization profiles, fonts, toggles (see [02-customization.md](./02-customization.md)).
- Per-model access by plan (Models tab).
- Invoice list rendered in-app (portal is enough).
- Changing plan feature bullets (copy stays in `SETTINGS_PLANS`).
