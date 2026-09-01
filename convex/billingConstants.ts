export const PLAN_IDS = ["free", "pro", "premier"] as const

export type PlanId = (typeof PLAN_IDS)[number]

export const PLAN_QUOTAS = {
  free: { baseMs: 30 * 60_000, burstMs: 0 },
  pro: { baseMs: 4 * 60 * 60_000, burstMs: 2 * 60 * 60_000 },
  premier: { baseMs: 40 * 60 * 60_000, burstMs: 10 * 60 * 60_000 },
} as const satisfies Record<PlanId, { baseMs: number; burstMs: number }>

export const PLAN_LABELS = {
  free: "Free Plan",
  pro: "Pro Plan",
  premier: "Premier Plan",
} as const satisfies Record<PlanId, string>

export const FREE_PERIOD_MS = 24 * 60 * 60 * 1000

export const USAGE_LIMIT_CODE = "USAGE_LIMIT" as const

export const USAGE_LIMIT_MESSAGE =
  "Usage limit reached. Upgrade or wait until the plan renews."
