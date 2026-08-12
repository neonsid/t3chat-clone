import { v } from "convex/values"

import { MAX_ATTACHMENTS_PER_MESSAGE } from "./attachmentConstants"
import { MAX_MODEL_CONTEXT_MESSAGES, MAX_THREAD_MESSAGES } from "./constants"
import { authedQuery } from "./helpers/functions"
import { getMessageContent, getMessageThinking } from "./helpers/messages"
import { getOwnedThread } from "./helpers/threads"

const contextAttachmentValidator = v.object({
  attachmentId: v.string(),
  kind: v.union(v.literal("image"), v.literal("pdf")),
  mimeType: v.string(),
  filename: v.string(),
  objectKey: v.string(),
  sizeBytes: v.number(),
})

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
  returns: v.array(
    v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      thinking: v.optional(v.string()),
      createdAt: v.number(),
      attachments: v.array(contextAttachmentValidator),
    })
  ),
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

    const ordered = messages.reverse()
    const result = []

    for (const message of ordered) {
      const attachments =
        message.role === "user"
          ? await ctx.db
              .query("attachments")
              .withIndex("by_threadId_and_messageId", (query) =>
                query
                  .eq("threadId", thread._id)
                  .eq("messageId", message.messageId)
              )
              .take(MAX_ATTACHMENTS_PER_MESSAGE)
          : []

      result.push({
        id: message.messageId,
        role: message.role,
        content: getMessageContent(message),
        thinking: getMessageThinking(message) || undefined,
        createdAt: message.createdAt,
        attachments: attachments
          .filter((attachment) => attachment.status === "ready")
          .map((attachment) => ({
            attachmentId: attachment.attachmentId,
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            filename: attachment.filename,
            objectKey: attachment.objectKey,
            sizeBytes: attachment.sizeBytes,
          })),
      })
    }

    return result
  },
})
