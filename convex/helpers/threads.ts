import { ConvexError } from "convex/values"

import { DEFAULT_THREAD_TITLE, MAX_THREAD_TITLE_LENGTH } from "../constants"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type OwnedThreadContext = Pick<QueryCtx | MutationCtx, "db"> & {
  viewerId: string
}

export async function getOwnedThread(
  ctx: OwnedThreadContext,
  threadId: Id<"threads">
): Promise<Doc<"threads">> {
  const thread = await ctx.db.get("threads", threadId)

  if (!thread || thread.ownerId !== ctx.viewerId) {
    throw new ConvexError("Thread not found")
  }

  return thread
}

export function titleFromFirstMessage(content: string): string {
  const title = content.trim()
  if (!title) return DEFAULT_THREAD_TITLE

  return title.length > MAX_THREAD_TITLE_LENGTH
    ? `${title.slice(0, MAX_THREAD_TITLE_LENGTH).trimEnd()}…`
    : title
}
