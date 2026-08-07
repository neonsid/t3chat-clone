import { v } from "convex/values"

import { MAX_MODEL_CONTEXT_MESSAGES, MAX_THREAD_MESSAGES } from "./constants"
import { authedQuery } from "./helpers/functions"
import { getMessageContent } from "./helpers/messages"
import { getOwnedThread } from "./helpers/threads"

export const listForThread = authedQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId("threads", args.threadId)
    if (!threadId) return []

    const thread = await ctx.db.get("threads", threadId)
    if (
      !thread ||
      thread.ownerId !== ctx.viewerId ||
      thread.state !== "active"
    ) {
      return []
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_sequence", (query) =>
        query.eq("threadId", thread._id)
      )
      .order("desc")
      .take(MAX_THREAD_MESSAGES)

    return messages.reverse()
  },
})

export const getContext = authedQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    if (thread.state !== "active") return []

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_sequence", (query) =>
        query.eq("threadId", thread._id)
      )
      .order("desc")
      .take(MAX_MODEL_CONTEXT_MESSAGES)

    return messages.reverse().map((message) => ({
      id: message.messageId,
      role: message.role,
      content: getMessageContent(message),
      createdAt: message.createdAt,
    }))
  },
})
