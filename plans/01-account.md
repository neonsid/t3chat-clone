# Phase 1 — Account settings backend

The Account page UI is complete and static. This plan covers every clickable or displayed control on `/settings` (the Account tab) plus the shared settings rail, and the Convex / Clerk / Polar work needed to make them real.

## Current state

| Area | Today |
| --- | --- |
| Auth | Clerk. Convex `ownerId` is `identity.tokenIdentifier`. There is **no** `users` table. |
| Billing | None. No Polar, Stripe, or Clerk Billing. |
| Plans | `SETTINGS_PLANS` and `SETTINGS_USAGE` in `src/components/settings/constants.ts` are hardcoded (`currentPlanId: "pro"`, `baseRemainingLabel: "3h 20m"`, `renewsOnLabel: "Aug 22, 2026"`). |
| Preferences | `preferences` table only stores selected model, favorites, and `combineResults`. |
| Chat quota | `/api/chat` and `chatRuns.start` do not check a plan or remaining usage. Thread message cap is the only limit. Temporary chats skip `chatRuns.start` entirely. |
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
| Settings tabs | Account, Customization, History & Sync, and Models are real routes; remaining tabs are placeholders |
| Change Email | Clerk user profile |
| View Devices | Clerk user profile |
| Keyboard shortcut list | Static display |
| Customize shortcuts | Navigates to `/settings/shortcuts` (placeholder until that phase) |
| Usage info tooltip | Static copy |

### Needs backend (this phase)

| Control | File | Required work |
| --- | --- | --- |
| Plan badge ("Pro Plan") | `SettingsRail.tsx`, `SidebarAccount.tsx` | Live plan from Polar subscription |
| Base usage bar + remaining time | `SettingsRail.tsx` | Live remaining base quota |
| Burst overage bar | `SettingsRail.tsx` | Live burst used / cap |
| "Plan renews on …" | `SettingsRail.tsx` | Period end from Polar (paid) or the free 24h window |
| Manage Billing & Invoices | `AccountSettings.tsx` | Polar customer portal URL; disabled on free until a Polar customer exists |
| Upgrade / Downgrade / Current Plan | `AccountSettings.tsx` | Checkout for a first paid plan; Polar `changeSubscription` between paid plans; cancel-at-period-end for free |
| Email me receipts | `AccountSettings.tsx` | Persist boolean only. Polar always emails its own order receipts; there is no Polar API for this toggle. |
| Delete Account | `AccountSettings.tsx` | Schedule Convex + R2 + Polar wipe, then Clerk `user.delete()` |

## Billing provider

**Use Polar** (`@convex-dev/polar`) for money. Do **not** mirror Polar subscriptions into our own plan/status columns.

Why Polar, not Clerk Billing:

- T3 Chat uses Polar for checkout, invoices, and the customer portal.
- Convex ships an official Polar component that already stores customers, products, and subscriptions and handles `/polar/events`.
- Email/devices stay on Clerk. Polar only owns money.

Polar's `getUserInfo.userId` is `identity.subject` (Clerk `user_…`). That is stable and matches Clerk webhooks. Every other table keeps `ownerId` = `identity.tokenIdentifier`.

The Polar component already:

- Upserts customers and subscriptions from Polar webhooks
- Exposes `getCurrentSubscription`, `createCheckoutSession`, `createCustomerPortalSession`, `changeSubscription`, `cancelSubscription`
- Registers `POST /polar/events` via `polar.registerRoutes(http)`

We wrap those methods so the client sends `planId` (`pro` / `premier`), never Polar product UUIDs. Do not export `polar.api()` wholesale.

Keep `SETTINGS_PLANS` as the UI catalog. Polar product keys must be `pro` and `premier`. Do not replace the custom cards with Polar's hosted pricing table.

| Plan id | UI price | Polar |
| --- | --- | --- |
| `free` | $0 | No Polar subscription (`getCurrentSubscription` returns null) |
| `pro` | $8 / month | Polar product mapped as `pro` |
| `premier` | $50 / month | Polar product mapped as `premier` |

## Schema

No migration of existing fields. New tables only.

`billingAccounts` is **not** a Polar cache. It stores app-owned fields plus a Clerk id so a dashboard deletion can find Convex rows.

```ts
// convex/schema.ts (add)

billingAccounts: defineTable({
  ownerId: v.string(),
  clerkUserId: v.string(),
  emailReceipts: v.boolean(),
})
  .index("by_ownerId", ["ownerId"])
  .index("by_clerkUserId", ["clerkUserId"]),

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
  threadId: v.optional(v.id("threads")),
  modelId: v.string(),
  durationMs: v.number(),
  outputTokens: v.number(),
  bucket: v.union(v.literal("base"), v.literal("burst")),
  createdAt: v.number(),
})
  .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"])
  .index("by_ownerId_and_runId", ["ownerId", "runId"]),
```

Why two usage tables:

- `usageCounters` is the document the settings rail reads (one row per owner per period). Update it in the **same mutation** that completes a chat run so the meter cannot drift.
- `usageEvents` is an audit log. Do not `.collect()` it on the settings page. Cap reads with the owner+time index if we ever show a usage breakdown.

Quota numbers live in `convex/billingConstants.ts` (not in components):

```ts
export const PLAN_QUOTAS = {
  free: { baseMs: 30 * 60_000, burstMs: 0 },
  pro: { baseMs: 4 * 60 * 60_000, burstMs: 2 * 60 * 60_000 },
  premier: { baseMs: 40 * 60 * 60_000, burstMs: 10 * 60 * 60_000 },
} as const
```

Tune the hours against real model cost later. The UI already speaks in hours/minutes (`3h 13m`).

Period:

- Paid: Polar `currentPeriodStart` / `currentPeriodEnd` (ISO strings on the Polar subscription doc; parse to ms).
- Free: a rolling 24h window stored on the counter row. Roll lazily in mutations when `now >= periodEnd`. Do not add a cron for this.
- `getAccount` is a query: pass `now` from the client, rounded to the current minute so the subscription stays cacheable. Never call `Date.now()` inside the query. If the stored counter is expired, return zero usage without writing.

## Convex functions

All public functions: `authedQuery` / `authedMutation` / `authedAction`, `args` + `returns` validators, derive identity from `ctx.auth` (never take `userId` from the client).

Files:

- `convex/polar.ts` — Polar client, checkout / portal / change / cancel actions, `registerRoutes` used from `http.ts`
- `convex/billing.ts` — `getAccount`, `setEmailReceipts`, `assertWithinQuota`, `recordUsage`
- `convex/helpers/usage.ts` — shared quota + meter writes used by `chatRuns` and billing
- `convex/accounts.ts` — delete cascade
- `convex/http.ts` — Polar webhook + Clerk `user.deleted`

### Read

- `billing.getAccount({ now })`
  - Polar `getCurrentSubscription({ userId: identity.subject })` → `planId` (`free` if null)
  - Polar `getCustomerByUserId` → `hasBillingCustomer` for the portal button
  - Latest `usageCounters` for this owner; expired → zeros
  - `emailReceipts` from `billingAccounts`, default `true` if missing
  - Returns `{ planId, planLabel, status, currentPeriodEnd, cancelAtPeriodEnd, emailReceipts, hasBillingCustomer, usage: { baseUsedMs, baseLimitMs, burstUsedMs, burstLimitMs, baseRemainingMs } }`
  - Client formats remaining as `3h 13m` and bar percents. Keep that formatting in `src/components/settings/logic.ts`.

### Write

- `billing.setEmailReceipts({ enabled })` — ensure `billingAccounts`, patch `emailReceipts`. Do not call Polar.
- `polar.createCheckout({ planId, origin })` — first paid plan only. Reject `free`, reject if already on that plan, reject if a paid subscription already exists (use `changePlan` instead). Returns `{ url }`. `successUrl` is `{origin}/settings`.
- `polar.changePlan({ planId })` — paid → paid via Polar `changeSubscription`. Confirm in the UI first.
- `polar.cancelPlan()` — cancel at period end (`revokeImmediately: false`). Powers **Downgrade** to Free.
- `polar.createPortalSession({ returnUrl })` — Polar customer portal. Powers **Manage Billing & Invoices**. Throws if there is no Polar customer; the button stays disabled on free.

No custom `applyPolarEvent`. Polar's built-in webhook persistence is the subscription source of truth. Optional `events` handlers are logging-only.

### Chat gating (required for the meters to mean anything)

Shared helper used by `chatRuns.start` and `billing.assertWithinQuota`:

1. Resolve plan from Polar (missing sub → free).
2. Load or create the current `usageCounters` row (roll the period in this mutation if `periodEnd` has passed). `Date.now()` is allowed here.
3. If `baseUsedMs + burstUsedMs >= baseLimit + burstLimit`, throw `ConvexError({ code: "USAGE_LIMIT", message: "Usage limit reached. Upgrade or wait until the plan renews." })`.

When a run completes (`chatRuns.complete` / `stop` / `fail` with `generation.durationMs`):

1. Insert `usageEvents` (dedupe on `by_ownerId_and_runId`).
2. Add `durationMs` to `baseUsedMs` until the base cap, then to `burstUsedMs`.
3. Same mutation as the message patch so the rail and the chat cannot disagree.

`/api/chat` should catch `USAGE_LIMIT` and return HTTP 429 with that message. Temporary chats never hit `chatRuns.start`; they must call `billing.assertWithinQuota` before streaming, then `billing.recordUsage` when the stream ends so temp chats cannot bypass the meter.

Model-set gating (Free = "select models", Pro = "all models") can wait until the Models tab. For Phase 1, quota is enough.

### Account deletion

1. Client confirms (keep the existing `window.confirm`).
2. `accounts.scheduleDelete` mutation:
   - Verify auth, ensure `billingAccounts` (clerkUserId mapping).
   - Schedule Polar cancel (internal action, revoke immediately, no-op if no customer).
   - Schedule `internal.accounts.deleteOwnerBatch({ ownerId })`.
   - Return immediately.
3. Client then calls Clerk `user.delete()` and navigates home. Convex wipe continues in the background. The user is already logged out.
4. `deleteOwnerBatch` walks, in batches of `THREAD_DELETE_BATCH_SIZE`:
   - Mark the owner's threads `deleting` and reuse `threads.deleteBatch`
   - leftover `chatRuns`, `attachments` + R2, `preferences`, `usageEvents`, `usageCounters`, `billingAccounts`
5. Clerk `user.deleted` webhook looks up `billingAccounts` by `clerkUserId` (fallback: reconstruct `ownerId` as `${CLERK_JWT_ISSUER_DOMAIN}|${clerkUserId}`) and runs the same batch. Idempotent if `scheduleDelete` already started.

Do not `.collect()` a user's threads. Use the existing owner indexes.

## Frontend wiring (Account UI)

Keep the existing layout and cards. Do not redesign.

| Change | Where |
| --- | --- |
| Replace `SETTINGS_USAGE` reads with `useQuery(api.billing.getAccount)` | `SettingsRail`, `AccountSettings`, `SidebarAccount` |
| Format remaining ms → `3h 13m` and percents | new helpers in `logic.ts` + tests in `logic.test.ts` |
| Base bar = remaining / limit. Burst bar = used / limit. Matches the current mock. |
| `Manage Billing & Invoices` | `window.location` to portal URL; disable with tooltip when `!hasBillingCustomer` |
| Plan buttons | no sub + upgrade → checkout; paid → paid → `changePlan`; downgrade to free → `cancelPlan`; `current` stays disabled |
| Email receipts switch | `useMutation(api.billing.setEmailReceipts)` instead of `useState(true)` |
| Delete | `scheduleDelete`, then Clerk `user.delete()`, then navigate to `/` |
| Loading | reuse `SettingsBodySkeleton` patterns; do not flash "Free" then "Pro" |
| Errors | existing animated toast on checkout/portal/delete failure |

Guest users never see `/settings` (route already redirects). No guest billing.

## Polar / Clerk dashboard setup (not code)

- Enable Polar sandbox. Create monthly products and put their UUIDs in Convex env as `POLAR_PRO_PRODUCT_ID` and `POLAR_PREMIER_PRODUCT_ID`.
- `npx convex env set POLAR_ORGANIZATION_TOKEN …` (not `POLAR_ACCESS_TOKEN`).
- `npx convex env set POLAR_WEBHOOK_SECRET …`
- `npx convex env set POLAR_SERVER sandbox`
- Webhook URL: `{CONVEX_SITE_URL}/polar/events`. Enable `product.created`, `product.updated`, `subscription.created`, `subscription.updated`.
- Sync existing Polar products once (`internal.polar.syncProducts`) if they were created before the webhook existed.
- Clerk webhook `{CONVEX_SITE_URL}/clerk/webhook` for `user.deleted`. Set `CLERK_WEBHOOK_SECRET` in Convex env. JWT must include `email` so Polar checkout can create a customer.
- Success URL: `/settings`.

## Tests

- `getPlanAction` already exists. Add `formatUsageRemaining`, usage percents, plan label, and renews-on date helpers.
- Pure functions in `convex/billingLogic.ts`: period resolve, quota rejection, duration split across base/burst, usage event dedupe decision. Do not hit Polar.
- `/api/chat` maps `USAGE_LIMIT` to 429.

## Implementation order

1. Schema + constants + billing logic + `billing.getAccount` (UI can switch off hardcoded usage).
2. Polar component + checkout/portal/change/cancel + webhook register.
3. Usage counters hooked to run completion + gate `chatRuns.start` and temporary chats.
4. Email receipts mutation.
5. Account delete cascade + Clerk webhook.

## Out of scope for Phase 1

- Customization profiles, fonts, toggles (see [02-customization.md](./02-customization.md)).
- Per-model access by plan (Models tab).
- Invoice list rendered in-app (portal is enough).
- Changing plan feature bullets (copy stays in `SETTINGS_PLANS`).
- Polar-hosted pricing table.
- Immediate revoke when downgrading to Free (period-end cancel keeps access until `currentPeriodEnd`).
