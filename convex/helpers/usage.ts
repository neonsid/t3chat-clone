import { ConvexError } from "convex/values"

import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import {
  PLAN_QUOTAS,
  USAGE_LIMIT_CODE,
  USAGE_LIMIT_MESSAGE,
  type PlanId,
} from "../billingConstants"
import {
  isOverQuota,
  periodsEqual,
  planIdFromProductKey,
  quotasForPlan,
  resolveUsagePeriod,
  splitUsageDuration,
} from "../billingLogic"
import { polar } from "../polar"

type IdentityCtx = {
  viewerId: string
  viewer: { subject: string }
}

type DbCtx = Pick<QueryCtx | MutationCtx, "db">

export async function getLatestCounter(ctx: DbCtx, ownerId: string) {
  return await ctx.db
    .query("usageCounters")
    .withIndex("by_ownerId_and_periodStart", (query) =>
      query.eq("ownerId", ownerId)
    )
    .order("desc")
    .first()
}

export async function getCurrentSubscriptionForViewer(
  ctx: QueryCtx | MutationCtx,
  polarUserId: string
) {
  try {
    return await polar.getCurrentSubscription(ctx, { userId: polarUserId })
  } catch (error) {
    if (error instanceof Error && error.message === "Product not found") {
      return null
    }
    throw error
  }
}

export function planFromSubscription(
  subscription: { productKey?: string | null } | null
): PlanId {
  return planIdFromProductKey(subscription?.productKey)
}

export async function getOrCreateBillingAccount(
  ctx: MutationCtx & IdentityCtx
) {
  const existing = await ctx.db
    .query("billingAccounts")
    .withIndex("by_ownerId", (query) => query.eq("ownerId", ctx.viewerId))
    .unique()
  if (existing) return existing

  const id = await ctx.db.insert("billingAccounts", {
    ownerId: ctx.viewerId,
    clerkUserId: ctx.viewer.subject,
    emailReceipts: true,
  })
  const created = await ctx.db.get("billingAccounts", id)
  if (!created) throw new ConvexError("Unable to create billing account")
  return created
}

export async function getOrCreateUsageCounter(
  ctx: MutationCtx & IdentityCtx,
  planId: PlanId,
  subscription: {
    currentPeriodStart?: string | null
    currentPeriodEnd?: string | null
  } | null,
  now: number
) {
  const existing = await getLatestCounter(ctx, ctx.viewerId)
  const period = resolveUsagePeriod({
    now,
    planId,
    polarPeriodStart: subscription?.currentPeriodStart,
    polarPeriodEnd: subscription?.currentPeriodEnd,
    existing:
      existing && now < existing.periodEnd
        ? {
            periodStart: existing.periodStart,
            periodEnd: existing.periodEnd,
          }
        : null,
  })

  if (
    existing &&
    periodsEqual(period, {
      periodStart: existing.periodStart,
      periodEnd: existing.periodEnd,
    })
  ) {
    return existing
  }

  const id = await ctx.db.insert("usageCounters", {
    ownerId: ctx.viewerId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    baseUsedMs: 0,
    burstUsedMs: 0,
  })
  const created = await ctx.db.get("usageCounters", id)
  if (!created) throw new ConvexError("Unable to create usage counter")
  return created
}

export async function assertWithinQuotaForViewer(
  ctx: MutationCtx & IdentityCtx,
  now = Date.now()
) {
  const subscription = await getCurrentSubscriptionForViewer(
    ctx,
    ctx.viewer.subject
  )
  const planId = planFromSubscription(subscription)
  const counter = await getOrCreateUsageCounter(
    ctx,
    planId,
    subscription,
    now
  )
  if (isOverQuota(counter.baseUsedMs, counter.burstUsedMs, planId)) {
    throw new ConvexError({
      code: USAGE_LIMIT_CODE,
      message: USAGE_LIMIT_MESSAGE,
    })
  }
  return { planId, counter, subscription }
}

export async function applyRunUsage(
  ctx: MutationCtx & IdentityCtx,
  args: {
    runId: string
    threadId?: Id<"threads">
    modelId: string
    durationMs: number
    outputTokens: number
  }
) {
  const existingEvent = await ctx.db
    .query("usageEvents")
    .withIndex("by_ownerId_and_runId", (query) =>
      query.eq("ownerId", ctx.viewerId).eq("runId", args.runId)
    )
    .unique()
  if (existingEvent) return

  const subscription = await getCurrentSubscriptionForViewer(
    ctx,
    ctx.viewer.subject
  )
  const planId = planFromSubscription(subscription)
  const counter = await getOrCreateUsageCounter(
    ctx,
    planId,
    subscription,
    Date.now()
  )
  const quotas = quotasForPlan(planId)
  const split = splitUsageDuration(
    counter.baseUsedMs,
    args.durationMs,
    quotas.baseMs
  )

  await ctx.db.insert("usageEvents", {
    ownerId: ctx.viewerId,
    runId: args.runId,
    threadId: args.threadId,
    modelId: args.modelId,
    durationMs: Math.max(0, args.durationMs),
    outputTokens: Math.max(0, args.outputTokens),
    bucket: split.bucket,
    createdAt: Date.now(),
  })
  await ctx.db.patch("usageCounters", counter._id, {
    baseUsedMs: counter.baseUsedMs + split.baseMs,
    burstUsedMs: counter.burstUsedMs + split.burstMs,
  })
}

export function usageSnapshot(
  planId: PlanId,
  counter: Pick<Doc<"usageCounters">, "baseUsedMs" | "burstUsedMs"> | null
) {
  const quotas = PLAN_QUOTAS[planId]
  const baseUsedMs = counter?.baseUsedMs ?? 0
  const burstUsedMs = counter?.burstUsedMs ?? 0
  return {
    baseUsedMs,
    baseLimitMs: quotas.baseMs,
    burstUsedMs,
    burstLimitMs: quotas.burstMs,
    baseRemainingMs: Math.max(0, quotas.baseMs - baseUsedMs),
  }
}
