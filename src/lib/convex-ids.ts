import type { Id } from "../../convex/_generated/dataModel"

export function asThreadId(threadId: string): Id<"threads"> {
  // SAFETY: Convex table ids are branded strings; callers pass a threads document id.
  return threadId as Id<"threads">
}

export function asMessageId(messageId: string): Id<"messages"> {
  // SAFETY: Convex table ids are branded strings; callers pass a messages document id.
  return messageId as Id<"messages">
}
