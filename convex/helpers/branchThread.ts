import { ConvexError } from "convex/values"

import { MAX_ATTACHMENTS_PER_MESSAGE } from "../attachmentConstants"
import {
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_THREAD_MESSAGES,
} from "../constants"
import { cloneReadyAttachment } from "./cloneAttachment"
import { getOwnedThread } from "./threads"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

export async function branchThreadFromMessage(
  ctx: ViewerMutationCtx,
  args: {
    threadId: Id<"threads">
    messageId: string
  }
): Promise<Id<"threads">> {
  if (
    !args.messageId.trim() ||
    args.messageId.length > MAX_CHAT_IDENTIFIER_LENGTH
  ) {
    throw new ConvexError("Invalid chat identifiers")
  }

  const source = await getOwnedThread(ctx, args.threadId)
  if (source.state !== "active") throw new ConvexError("Thread not found")

  const recent = await ctx.db
    .query("messages")
    .withIndex("by_threadId_and_sequence", (query) =>
      query.eq("threadId", source._id)
    )
    .order("desc")
    .take(MAX_THREAD_MESSAGES)
  const chronological = recent.reverse()
  const branchIndex = chronological.findIndex(
    (message) => message.messageId === args.messageId
  )
  if (branchIndex < 0) throw new ConvexError("Message not found")

  const copied = chronological.slice(0, branchIndex + 1)
  if (copied.length === 0) throw new ConvexError("Chat is empty")

  const now = Date.now()
  const titleSource =
    source.titleSource === "pending" ? "derived" : source.titleSource
  const threadId = await ctx.db.insert("threads", {
    ownerId: ctx.viewerId,
    title: source.title,
    titleSource,
    state: "active",
    updatedAt: now,
    isPinned: false,
    hasMessages: true,
    messageCount: copied.length,
    nextSequence: copied.length,
    branchedFromThreadId: source._id,
    branchedFromMessageId: args.messageId,
  })

  let sequence = 0
  for (const message of copied) {
    const messageId = crypto.randomUUID()
    await ctx.db.insert("messages", {
      threadId,
      messageId,
      sequence,
      role: message.role,
      content: message.content,
      thinking: message.thinking,
      status: message.status,
      createdAt: message.createdAt,
      generation: message.generation,
      sources: message.sources,
      searchQueries: message.searchQueries,
      thinkingSearchSplitAt: message.thinkingSearchSplitAt,
    })

    if (message.role === "user") {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_threadId_and_messageId", (query) =>
          query
            .eq("threadId", source._id)
            .eq("messageId", message.messageId)
        )
        .take(MAX_ATTACHMENTS_PER_MESSAGE)

      for (const attachment of attachments) {
        if (attachment.status !== "ready") continue
        await cloneReadyAttachment(ctx, attachment, {
          threadId,
          messageId,
        })
      }
    }

    sequence += 1
  }

  return threadId
}
