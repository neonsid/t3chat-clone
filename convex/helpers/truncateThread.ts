import { ConvexError } from "convex/values"

import {
  ATTACHMENT_UNBOUND_TTL_MS,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "../attachmentConstants"
import {
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_THREAD_MESSAGES,
} from "../constants"
import { getOwnedThread } from "./threads"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

export async function truncateThreadFromMessage(
  ctx: ViewerMutationCtx,
  args: {
    threadId: Id<"threads">
    messageId: string
  }
): Promise<null> {
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
  const assistantIndex = chronological.findIndex(
    (message) => message.messageId === args.messageId
  )
  if (assistantIndex < 0) throw new ConvexError("Message not found")
  if (chronological[assistantIndex]?.role !== "assistant") {
    throw new ConvexError("Only assistant messages can be retried")
  }

  const hasPrecedingUser = chronological
    .slice(0, assistantIndex)
    .some((message) => message.role === "user")
  if (!hasPrecedingUser) throw new ConvexError("Message not found")

  const dropped = chronological.slice(assistantIndex)
  const now = Date.now()

  for (const message of dropped) {
    if (message.role === "user") {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_threadId_and_messageId", (query) =>
          query.eq("threadId", source._id).eq("messageId", message.messageId)
        )
        .take(MAX_ATTACHMENTS_PER_MESSAGE)

      for (const attachment of attachments) {
        await ctx.db.patch("attachments", attachment._id, {
          bindingStatus: "unbound",
          threadId: undefined,
          messageId: undefined,
          expiresAt: now + ATTACHMENT_UNBOUND_TTL_MS,
        })
      }
    }

    await ctx.db.delete("messages", message._id)
  }

  await ctx.db.patch("threads", source._id, {
    updatedAt: now,
    messageCount: assistantIndex,
    nextSequence: assistantIndex,
  })

  return null
}
