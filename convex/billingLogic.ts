import { ConvexError } from "convex/values"
import { z } from "zod"

import {
  FREE_PERIOD_MS,
  PLAN_IDS,
  PLAN_LABELS,
  PLAN_QUOTAS,
  USAGE_LIMIT_CODE,
  type PlanId,
} from "./billingConstants"

export type UsagePeriod = {
  periodStart: number
  periodEnd: number
}

export function isPlanId(value: string): value is PlanId {
  return PLAN_IDS.some((id) => id === value)
}

export function planIdFromProductKey(
  productKey: string | null | undefined
): PlanId {
  if (productKey === "pro" || productKey === "premier") return productKey
  return "free"
}

export function planLabel(planId: PlanId) {
  return PLAN_LABELS[planId]
}

export function quotasForPlan(planId: PlanId) {
  return PLAN_QUOTAS[planId]
}

export function parsePolarTime(value: string | null | undefined) {
  if (!value) return undefined
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : undefined
}

export function resolveUsagePeriod(args: {
  now: number
  planId: PlanId
  polarPeriodStart?: string | null
  polarPeriodEnd?: string | null
  existing?: UsagePeriod | null
}): UsagePeriod {
  if (args.planId !== "free") {
    const periodStart = parsePolarTime(args.polarPeriodStart)
    const periodEnd = parsePolarTime(args.polarPeriodEnd)
    if (periodStart !== undefined && periodEnd !== undefined) {
      return { periodStart, periodEnd }
    }
  }

  if (args.existing && args.now < args.existing.periodEnd) {
    return args.existing
  }

  return {
    periodStart: args.now,
    periodEnd: args.now + FREE_PERIOD_MS,
  }
}

export function periodsEqual(left: UsagePeriod, right: UsagePeriod) {
  return (
    left.periodStart === right.periodStart && left.periodEnd === right.periodEnd
  )
}

export function isOverQuota(
  baseUsedMs: number,
  burstUsedMs: number,
  planId: PlanId
) {
  const quotas = PLAN_QUOTAS[planId]
  return baseUsedMs + burstUsedMs >= quotas.baseMs + quotas.burstMs
}

export function splitUsageDuration(
  baseUsedMs: number,
  durationMs: number,
  baseLimitMs: number
) {
  const safeDuration = Math.max(0, durationMs)
  const baseRoom = Math.max(0, baseLimitMs - baseUsedMs)
  const baseMs = Math.min(safeDuration, baseRoom)
  const burstMs = safeDuration - baseMs
  if (baseMs === safeDuration) {
    return { baseMs, burstMs, bucket: "base" as const }
  }
  return { baseMs, burstMs, bucket: "burst" as const }
}

const usageLimitData = z.object({
  code: z.literal(USAGE_LIMIT_CODE),
})

export function isUsageLimitError(error: Error) {
  if (!(error instanceof ConvexError)) return false
  return usageLimitData.safeParse(error.data).success
}
