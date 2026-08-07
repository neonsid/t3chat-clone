import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import {
  DEFAULT_THREAD_TITLE,
  MAX_PINNED_THREADS,
  MAX_SEARCH_LENGTH,
  MAX_SEARCH_RESULTS,
  MAX_THREAD_TITLE_LENGTH,
  THREAD_DELETE_BATCH_SIZE,
} from "./constants"
import { authedMutation, authedQuery } from "./helpers/functions"
import { getOwnedThread, titleFromFirstMessage } from "./helpers/threads"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

async function createEmptyThread(
  ctx: ViewerMutationCtx
): Promise<Id<"threads">> {
  const now = Date.now()
  return await ctx.db.insert("threads", {
    ownerId: ctx.viewerId,
    title: DEFAULT_THREAD_TITLE,
    titleSource: "derived",
    state: "active",
    updatedAt: now,
    isPinned: false,
    hasMessages: false,
    messageCount: 0,
    nextSequence: 0,
  })
}

async function getOrCreateNextThread(
  ctx: ViewerMutationCtx
): Promise<Id<"threads">> {
  const nextThread = await ctx.db
    .query("threads")
    .withIndex("by_ownerId_and_state_and_updatedAt", (query) =>
      query.eq("ownerId", ctx.viewerId).eq("state", "active")
    )
    .order("desc")
    .first()

  if (nextThread) return nextThread._id

  return await createEmptyThread(ctx)
}

export const createOrReuseEmpty = authedMutation({
  args: {},
  handler: async (ctx) => {
    const emptyThread = await ctx.db
      .query("threads")
      .withIndex("by_ownerId_and_state_and_hasMessages", (query) =>
        query
          .eq("ownerId", ctx.viewerId)
          .eq("state", "active")
          .eq("hasMessages", false)
      )
      .order("desc")
      .first()

    if (emptyThread) return emptyThread._id

    return await createEmptyThread(ctx)
  },
})

export const get = authedQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId("threads", args.threadId)
    if (!threadId) return null

    const thread = await ctx.db.get("threads", threadId)
    if (
      !thread ||
      thread.ownerId !== ctx.viewerId ||
      thread.state !== "active"
    ) {
      return null
    }
    return thread
  },
})

export const listRecent = authedQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex(
        "by_ownerId_and_state_and_hasMessages_and_isPinned_and_updatedAt",
        (query) =>
          query
            .eq("ownerId", ctx.viewerId)
            .eq("state", "active")
            .eq("hasMessages", true)
            .eq("isPinned", false)
      )
      .order("desc")
      .paginate(args.paginationOpts)
  },
})

export const listPinned = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("threads")
      .withIndex(
        "by_ownerId_and_state_and_hasMessages_and_isPinned_and_pinnedAt",
        (query) =>
          query
            .eq("ownerId", ctx.viewerId)
            .eq("state", "active")
            .eq("hasMessages", true)
            .eq("isPinned", true)
      )
      .order("desc")
      .take(MAX_PINNED_THREADS)
  },
})

export const search = authedQuery({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const searchText = args.search.trim().slice(0, MAX_SEARCH_LENGTH)
    if (!searchText) return []

    return await ctx.db
      .query("threads")
      .withSearchIndex("search_title", (query) =>
        query
          .search("title", searchText)
          .eq("ownerId", ctx.viewerId)
          .eq("state", "active")
          .eq("hasMessages", true)
      )
      .take(MAX_SEARCH_RESULTS)
  },
})

export const rename = authedMutation({
  args: { threadId: v.id("threads"), title: v.string() },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    if (thread.state !== "active") throw new ConvexError("Thread not found")

    const title = args.title.trim().slice(0, MAX_THREAD_TITLE_LENGTH)
    if (!title) throw new ConvexError("Title cannot be empty")

    await ctx.db.patch("threads", thread._id, {
      title,
      titleSource: "manual",
    })
    return null
  },
})

export const regenerateTitle = authedMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    const firstMessage = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_sequence", (query) =>
        query.eq("threadId", thread._id)
      )
      .order("asc")
      .first()

    const firstText = firstMessage?.parts.find(
      (part) => part.type === "text"
    )?.content

    await ctx.db.patch("threads", thread._id, {
      title: firstText
        ? titleFromFirstMessage(firstText)
        : DEFAULT_THREAD_TITLE,
      titleSource: "derived",
    })
    return null
  },
})

export const setPinned = authedMutation({
  args: { threadId: v.id("threads"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    if (thread.state !== "active") throw new ConvexError("Thread not found")
    if (args.pinned && !thread.isPinned) {
      const pinnedThreads = await ctx.db
        .query("threads")
        .withIndex(
          "by_ownerId_and_state_and_hasMessages_and_isPinned_and_pinnedAt",
          (query) =>
            query
              .eq("ownerId", ctx.viewerId)
              .eq("state", "active")
              .eq("hasMessages", true)
              .eq("isPinned", true)
        )
        .take(MAX_PINNED_THREADS)
      if (pinnedThreads.length >= MAX_PINNED_THREADS) {
        throw new ConvexError("Pinned chat limit reached")
      }
    }

    await ctx.db.patch("threads", thread._id, {
      isPinned: args.pinned,
      pinnedAt: args.pinned ? Date.now() : undefined,
    })
    return null
  },
})

export const archive = authedMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    if (thread.state !== "active") return await getOrCreateNextThread(ctx)

    await ctx.db.patch("threads", thread._id, {
      state: "archived",
      isPinned: false,
      pinnedAt: undefined,
      updatedAt: Date.now(),
    })
    return await getOrCreateNextThread(ctx)
  },
})

export const remove = authedMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    await ctx.db.patch("threads", thread._id, {
      state: "deleting",
      isPinned: false,
      pinnedAt: undefined,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.threads.deleteBatch, {
      threadId: thread._id,
    })
    return await getOrCreateNextThread(ctx)
  },
})

export const deleteBatch = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_sequence", (query) =>
        query.eq("threadId", args.threadId)
      )
      .take(THREAD_DELETE_BATCH_SIZE)

    for (const message of messages) {
      await ctx.db.delete("messages", message._id)
    }

    if (messages.length === THREAD_DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.threads.deleteBatch, args)
      return null
    }

    const runs = await ctx.db
      .query("chatRuns")
      .withIndex("by_threadId_and_status", (query) =>
        query.eq("threadId", args.threadId)
      )
      .take(THREAD_DELETE_BATCH_SIZE)

    for (const run of runs) {
      await ctx.db.delete("chatRuns", run._id)
    }

    if (runs.length === THREAD_DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.threads.deleteBatch, args)
      return null
    }

    const thread = await ctx.db.get("threads", args.threadId)
    if (thread?.state === "deleting") {
      await ctx.db.delete("threads", thread._id)
    }
    return null
  },
})
