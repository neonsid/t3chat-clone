import { ConvexError } from "convex/values"

import {
  sanitizeGeneratedTitle,
  titleFromFirstMessage,
} from "../../src/lib/thread-title"
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

export { sanitizeGeneratedTitle, titleFromFirstMessage }
