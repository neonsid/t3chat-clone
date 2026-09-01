import { Polar } from "@convex-dev/polar"
import { subscriptionsUpdate } from "@polar-sh/sdk/funcs/subscriptionsUpdate.js"
import { ConvexError, v } from "convex/values"

import { api, components } from "./_generated/api"
import { internalAction } from "./_generated/server"
import type { DataModel } from "./_generated/dataModel"
import { planIdFromProductKey } from "./billingLogic"
import { authedAction, authedQuery } from "./helpers/functions"

const POLAR_PRODUCTS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID ?? "",
  premier: process.env.POLAR_PREMIER_PRODUCT_ID ?? "",
} as const

export const getViewerBillingIdentity = authedQuery({
  args: {},
  returns: v.object({
    userId: v.string(),
    email: v.string(),
  }),
  handler: async (ctx) => {
    const email = ctx.viewer.email
    if (!email) {
      throw new ConvexError("An email address is required for billing")
    }
    return {
      userId: ctx.viewer.subject,
      email,
    }
  },
})

export const polar = new Polar<DataModel, typeof POLAR_PRODUCTS>(
  components.polar,
  {
    products: POLAR_PRODUCTS,
    getUserInfo: async (ctx) => {
      const identity: { userId: string; email: string } = await ctx.runQuery(
        api.polar.getViewerBillingIdentity,
        {}
      )
      return identity
    },
  }
)

function requireProductId(planId: "pro" | "premier") {
  const productId = POLAR_PRODUCTS[planId]
  if (!productId) {
    throw new ConvexError("Billing is not configured")
  }
  return productId
}

function requireOrigin(origin: string) {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    throw new ConvexError("Invalid checkout origin")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConvexError("Invalid checkout origin")
  }
  return url.origin
}

export const createCheckout = authedAction({
  args: {
    planId: v.union(v.literal("pro"), v.literal("premier")),
    origin: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const origin = requireOrigin(args.origin)
    const productId = requireProductId(args.planId)
    const email = ctx.viewer.email
    if (!email) {
      throw new ConvexError("An email address is required for billing")
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: ctx.viewer.subject,
    })
    const currentPlanId = planIdFromProductKey(subscription?.productKey)
    if (currentPlanId === args.planId) {
      throw new ConvexError("Already on this plan")
    }
    if (currentPlanId !== "free") {
      throw new ConvexError("Change the existing subscription instead")
    }

    const checkout = await polar.createCheckoutSession(ctx, {
      productIds: [productId],
      userId: ctx.viewer.subject,
      email,
      origin,
      successUrl: `${origin}/settings`,
    })
    return { url: checkout.url }
  },
})

export const changePlan = authedAction({
  args: {
    planId: v.union(v.literal("pro"), v.literal("premier")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const productId = requireProductId(args.planId)
    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: ctx.viewer.subject,
    })
    const currentPlanId = planIdFromProductKey(subscription?.productKey)
    if (currentPlanId === "free") {
      throw new ConvexError("Start a subscription from checkout")
    }
    if (currentPlanId === args.planId) {
      throw new ConvexError("Already on this plan")
    }
    await polar.changeSubscription(ctx, { productId })
    return null
  },
})

export const cancelPlan = authedAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await polar.cancelSubscription(ctx, { revokeImmediately: false })
    return null
  },
})

export const createPortalSession = authedAction({
  args: {
    returnUrl: v.optional(v.string()),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const { url } = await polar.createCustomerPortalSession(ctx, {
      userId: ctx.viewer.subject,
      returnUrl: args.returnUrl,
    })
    return { url }
  },
})

export const cancelForUser = internalAction({
  args: { polarUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: args.polarUserId,
    })
    if (!subscription) return null
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return null
    }

    const updated = await subscriptionsUpdate(polar.polar, {
      id: subscription.id,
      subscriptionUpdate: { revoke: true },
    })
    if (!updated.ok) {
      console.error("Polar cancel during account delete failed", updated.error)
    }
    return null
  },
})

export const syncProducts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await polar.syncProducts(ctx)
    return null
  },
})
