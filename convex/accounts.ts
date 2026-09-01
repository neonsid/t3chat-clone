import { v } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { THREAD_DELETE_BATCH_SIZE } from "./constants"
import { authedMutation } from "./helpers/functions"
import { getOrCreateBillingAccount } from "./helpers/usage"

const THREAD_STATES = ["active", "archived", "deleting"] as const
const RUN_STATUSES = ["running", "complete", "stopped", "failed"] as const

export const scheduleDelete = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await getOrCreateBillingAccount(ctx)
    await ctx.scheduler.runAfter(0, internal.polar.cancelForUser, {
      polarUserId: ctx.viewer.subject,
    })
    await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, {
      ownerId: ctx.viewerId,
    })
    return null
  },
})

export const deleteOwnerByClerkUserId = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("billingAccounts")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", args.clerkUserId)
      )
      .unique()
    const ownerId = account?.ownerId ?? ownerIdFromClerkUserId(args.clerkUserId)
    if (!ownerId) return null

    await ctx.scheduler.runAfter(0, internal.polar.cancelForUser, {
      polarUserId: args.clerkUserId,
    })
    await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, {
      ownerId,
    })
    return null
  },
})

export const deleteOwnerBatch = internalMutation({
  args: { ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const threads = await takeOwnerThreads(ctx, args.ownerId)
    if (threads.length > 0) {
      for (const thread of threads) {
        if (thread.state !== "deleting") {
          await ctx.db.patch("threads", thread._id, {
            state: "deleting",
            isPinned: false,
            pinnedAt: undefined,
            updatedAt: Date.now(),
          })
        }
        await ctx.scheduler.runAfter(0, internal.threads.deleteBatch, {
          threadId: thread._id,
        })
      }
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const leftoverThread = await findAnyOwnerThread(ctx, args.ownerId)
    if (leftoverThread) {
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const runs = await takeOwnerRuns(ctx, args.ownerId)
    if (runs.length > 0) {
      for (const run of runs) {
        await ctx.db.delete("chatRuns", run._id)
      }
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const attachmentCleanup = await ctx.runMutation(
      internal.attachments.beginOwnerAttachmentDeletion,
      { ownerId: args.ownerId }
    )
    if (attachmentCleanup.remaining) {
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_ownerId_and_createdAt", (query) =>
        query.eq("ownerId", args.ownerId)
      )
      .take(THREAD_DELETE_BATCH_SIZE)
    if (usageEvents.length > 0) {
      for (const event of usageEvents) {
        await ctx.db.delete("usageEvents", event._id)
      }
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const counters = await ctx.db
      .query("usageCounters")
      .withIndex("by_ownerId_and_periodStart", (query) =>
        query.eq("ownerId", args.ownerId)
      )
      .take(THREAD_DELETE_BATCH_SIZE)
    if (counters.length > 0) {
      for (const counter of counters) {
        await ctx.db.delete("usageCounters", counter._id)
      }
      await ctx.scheduler.runAfter(0, internal.accounts.deleteOwnerBatch, args)
      return null
    }

    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_ownerId", (query) => query.eq("ownerId", args.ownerId))
      .unique()
    if (preferences) {
      await ctx.db.delete("preferences", preferences._id)
    }

    const account = await ctx.db
      .query("billingAccounts")
      .withIndex("by_ownerId", (query) => query.eq("ownerId", args.ownerId))
      .unique()
    if (account) {
      await ctx.db.delete("billingAccounts", account._id)
    }

    return null
  },
})

async function takeOwnerThreads(ctx: Pick<MutationCtx, "db">, ownerId: string) {
  const rows = []
  for (const state of THREAD_STATES) {
    const remaining = THREAD_DELETE_BATCH_SIZE - rows.length
    if (remaining <= 0) break
    const batch = await ctx.db
      .query("threads")
      .withIndex("by_ownerId_and_state_and_updatedAt", (query) =>
        query.eq("ownerId", ownerId).eq("state", state)
      )
      .take(remaining)
    rows.push(...batch)
  }
  return rows
}

async function findAnyOwnerThread(
  ctx: Pick<MutationCtx, "db">,
  ownerId: string
) {
  for (const state of THREAD_STATES) {
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_ownerId_and_state_and_updatedAt", (query) =>
        query.eq("ownerId", ownerId).eq("state", state)
      )
      .first()
    if (thread) return thread
  }
  return null
}

async function takeOwnerRuns(ctx: Pick<MutationCtx, "db">, ownerId: string) {
  const rows = []
  for (const status of RUN_STATUSES) {
    const remaining = THREAD_DELETE_BATCH_SIZE - rows.length
    if (remaining <= 0) break
    const batch = await ctx.db
      .query("chatRuns")
      .withIndex("by_ownerId_and_status", (query) =>
        query.eq("ownerId", ownerId).eq("status", status)
      )
      .take(remaining)
    rows.push(...batch)
  }
  return rows
}

function ownerIdFromClerkUserId(clerkUserId: string) {
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN
  if (!issuer) return null
  return `${issuer}|${clerkUserId}`
}
