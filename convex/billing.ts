import { ConvexError, v } from "convex/values"

import { polar } from "./polar"
import { PLAN_LABELS } from "./billingConstants"
import { periodsEqual, resolveUsagePeriod } from "./billingLogic"
import { authedMutation, authedQuery } from "./helpers/functions"
import {
  applyRunUsage,
  assertWithinQuotaForViewer,
  getCurrentSubscriptionForViewer,
  getLatestCounter,
  getOrCreateBillingAccount,
  planFromSubscription,
  usageSnapshot,
} from "./helpers/usage"

const accountValidator = v.object({
  planId: v.union(v.literal("free"), v.literal("pro"), v.literal("premier")),
  planLabel: v.string(),
  status: v.string(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  emailReceipts: v.boolean(),
  hasBillingCustomer: v.boolean(),
  usage: v.object({
    baseUsedMs: v.number(),
    baseLimitMs: v.number(),
    burstUsedMs: v.number(),
    burstLimitMs: v.number(),
    baseRemainingMs: v.number(),
  }),
})

export const getAccount = authedQuery({
  args: { now: v.number() },
  returns: accountValidator,
  handler: async (ctx, args) => {
    const subscription = await getCurrentSubscriptionForViewer(
      ctx,
      ctx.viewer.subject
    )
    const planId = planFromSubscription(subscription)
    const latest = await getLatestCounter(ctx, ctx.viewerId)
    const existingPeriod =
      latest && args.now < latest.periodEnd
        ? { periodStart: latest.periodStart, periodEnd: latest.periodEnd }
        : null
    const period = resolveUsagePeriod({
      now: args.now,
      planId,
      polarPeriodStart: subscription?.currentPeriodStart,
      polarPeriodEnd: subscription?.currentPeriodEnd,
      existing: existingPeriod,
    })
    const counter =
      latest &&
      periodsEqual(period, {
        periodStart: latest.periodStart,
        periodEnd: latest.periodEnd,
      })
        ? latest
        : null

    const account = await ctx.db
      .query("billingAccounts")
      .withIndex("by_ownerId", (query) => query.eq("ownerId", ctx.viewerId))
      .unique()
    const customer = await polar.getCustomerByUserId(ctx, ctx.viewer.subject)

    return {
      planId,
      planLabel: PLAN_LABELS[planId],
      status: subscription?.status ?? "none",
      currentPeriodEnd: period.periodEnd,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      emailReceipts: account?.emailReceipts ?? true,
      hasBillingCustomer: customer !== null,
      usage: usageSnapshot(planId, counter),
    }
  },
})

export const setEmailReceipts = authedMutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await getOrCreateBillingAccount(ctx)
    await ctx.db.patch("billingAccounts", account._id, {
      emailReceipts: args.enabled,
    })
    return null
  },
})

export const assertWithinQuota = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await assertWithinQuotaForViewer(ctx)
    return null
  },
})

export const recordUsage = authedMutation({
  args: {
    runId: v.string(),
    threadId: v.optional(v.id("threads")),
    modelId: v.string(),
    durationMs: v.number(),
    outputTokens: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.runId.trim()) throw new ConvexError("Invalid chat identifiers")
    await applyRunUsage(ctx, args)
    return null
  },
})
