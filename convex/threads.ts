import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import { MAX_ATTACHMENTS_PER_MESSAGE } from "./attachmentConstants"
import {
  DEFAULT_THREAD_TITLE,
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_PINNED_THREADS,
  MAX_SEARCH_LENGTH,
  MAX_SEARCH_RESULTS,
  MAX_THREAD_MESSAGES,
  MAX_THREAD_TITLE_LENGTH,
  THREAD_DELETE_BATCH_SIZE,
} from "./constants"
import { authedMutation, authedQuery } from "./helpers/functions"
import { getOwnedThread } from "./helpers/threads"
import type { MutationCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

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

async function getOrCreateEmptyThread(
  ctx: ViewerMutationCtx
): Promise<Doc<"threads">> {
  const emptyThread = await ctx.db
    .query("threads")
    .withIndex(
      "by_ownerId_and_state_and_hasMessages_and_isPinned_and_updatedAt",
      (query) =>
        query
          .eq("ownerId", ctx.viewerId)
          .eq("state", "active")
          .eq("hasMessages", false)
    )
    .order("desc")
    .first()

  if (emptyThread) return emptyThread

  const threadId = await createEmptyThread(ctx)
  const created = await ctx.db.get("threads", threadId)
  if (!created) throw new ConvexError("Thread not found")
  return created
}

const persistableTemporaryMessageValidator = v.object({
  messageId: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.optional(v.string()),
  thinking: v.optional(v.string()),
  status: v.union(
    v.literal("complete"),
    v.literal("stopped"),
    v.literal("failed")
  ),
  createdAt: v.number(),
  attachmentIds: v.optional(v.array(v.string())),
})

async function bindMessageAttachments(
  ctx: ViewerMutationCtx,
  threadId: Id<"threads">,
  messageId: string,
  attachmentIds: string[]
) {
  if (attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ConvexError("Too many attachments")
  }
  if (new Set(attachmentIds).size !== attachmentIds.length) {
    throw new ConvexError("Duplicate attachment ids")
  }

  for (const attachmentId of attachmentIds) {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", ctx.viewerId).eq("attachmentId", attachmentId)
      )
      .unique()
    if (!attachment) throw new ConvexError("Attachment not found")
    if (attachment.status !== "ready") {
      throw new ConvexError("Attachment is not ready")
    }
    if (attachment.bindingStatus === "bound") {
      if (
        attachment.threadId !== threadId ||
        attachment.messageId !== messageId
      ) {
        throw new ConvexError("Attachment is already bound")
      }
      continue
    }
    await ctx.db.patch("attachments", attachment._id, {
      bindingStatus: "bound",
      threadId,
      messageId,
      expiresAt: undefined,
    })
  }
}

export const createOrReuseEmpty = authedMutation({
  args: {},
  handler: async (ctx) => {
    const emptyThread = await getOrCreateEmptyThread(ctx)
    return emptyThread._id
  },
})

export const persistTemporary = authedMutation({
  args: {
    messages: v.array(persistableTemporaryMessageValidator),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    if (args.messages.length === 0) {
      throw new ConvexError("Chat is empty")
    }
    if (args.messages.length > MAX_THREAD_MESSAGES) {
      throw new ConvexError("This thread has reached its message limit")
    }

    const seenMessageIds = new Set<string>()
    for (const message of args.messages) {
      if (
        !message.messageId.trim() ||
        message.messageId.length > MAX_CHAT_IDENTIFIER_LENGTH
      ) {
        throw new ConvexError("Invalid chat identifiers")
      }
      if (seenMessageIds.has(message.messageId)) {
        throw new ConvexError("Duplicate message ids")
      }
      seenMessageIds.add(message.messageId)
      const content = message.content?.trim() ?? ""
      const thinking = message.thinking?.trim() ?? ""
      if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
        throw new ConvexError("Message is too long")
      }
      if (thinking.length > MAX_MESSAGE_CONTENT_LENGTH) {
        throw new ConvexError("Message is too long")
      }
      if (
        message.role === "assistant" &&
        (message.attachmentIds?.length ?? 0) > 0
      ) {
        throw new ConvexError("Assistant messages cannot have attachments")
      }
      if (
        message.role === "user" &&
        !content &&
        (message.attachmentIds?.length ?? 0) === 0
      ) {
        throw new ConvexError("Message cannot be empty")
      }
    }

    const thread = await getOrCreateEmptyThread(ctx)
    if (thread.state !== "active") throw new ConvexError("Thread not found")

    let nextSequence = thread.nextSequence
    let messageCount = thread.messageCount
    const now = Date.now()

    for (const message of args.messages) {
      const existingMessage = await ctx.db
        .query("messages")
        .withIndex("by_threadId_and_messageId", (query) =>
          query.eq("threadId", thread._id).eq("messageId", message.messageId)
        )
        .unique()
      if (existingMessage) continue

      const content = message.content?.trim() ?? ""
      const thinking = message.thinking?.trim() ?? ""
      await ctx.db.insert("messages", {
        threadId: thread._id,
        messageId: message.messageId,
        sequence: nextSequence,
        role: message.role,
        content: content || undefined,
        thinking: thinking || undefined,
        status: message.status,
        createdAt: message.createdAt || now,
      })
      nextSequence += 1
      messageCount += 1

      if (message.role === "user") {
        await bindMessageAttachments(
          ctx,
          thread._id,
          message.messageId,
          message.attachmentIds ?? []
        )
      }
    }

    await ctx.db.patch("threads", thread._id, {
      updatedAt: now,
      hasMessages: true,
      messageCount,
      nextSequence,
      titleSource: "pending",
    })
    await ctx.scheduler.runAfter(0, internal.threadTitles.generate, {
      threadId: thread._id,
    })
    return thread._id
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
    if (thread.state !== "active") throw new ConvexError("Thread not found")

    await ctx.db.patch("threads", thread._id, {
      title: DEFAULT_THREAD_TITLE,
      titleSource: "pending",
    })
    await ctx.scheduler.runAfter(0, internal.threadTitles.generate, {
      threadId: thread._id,
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
    const attachmentCleanup = await ctx.runMutation(
      internal.attachments.beginThreadAttachmentDeletion,
      {
        threadId: args.threadId,
      }
    )
    if (attachmentCleanup.remaining) {
      await ctx.scheduler.runAfter(0, internal.threads.deleteBatch, args)
      return null
    }

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
