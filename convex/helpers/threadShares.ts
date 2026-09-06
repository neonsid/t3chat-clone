import { ConvexError } from "convex/values"

import {
  createSharePublicId,
  isSharePublicId,
} from "../../src/lib/share-id"
import { MAX_ATTACHMENTS_PER_MESSAGE } from "../attachmentConstants"
import {
  DEFAULT_THREAD_TITLE,
  MAX_SHARES_PER_THREAD,
  MAX_THREAD_MESSAGES,
  SHARE_PUBLIC_ID_ATTEMPTS,
} from "../constants"
import { cloneReadyAttachmentForFork } from "./cloneAttachment"
import { getOwnedThread } from "./threads"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

export type ShareAttachment = {
  attachmentId: string
  messageId: string
  filename: string
  kind: Doc<"attachments">["kind"]
  mimeType: string
}

export type ShareMessage = {
  messageId: string
  role: Doc<"messages">["role"]
  content?: string
  thinking?: string
  status: Doc<"messages">["status"]
  createdAt: number
  sources?: Doc<"messages">["sources"]
  searchQueries?: string[]
  thinkingSearchSplitAt?: number
  generation?: Doc<"messages">["generation"]
  attachments: ShareAttachment[]
}

export async function getShareByPublicId(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  publicId: string
): Promise<Doc<"threadShares"> | null> {
  if (!isSharePublicId(publicId)) return null

  const share = await ctx.db
    .query("threadShares")
    .withIndex("by_publicId", (query) => query.eq("publicId", publicId))
    .unique()

  if (!share || share.revokedAt != null) return null
  return share
}

export async function listOwnedThreadShares(
  ctx: ViewerMutationCtx | (QueryCtx & { viewerId: string }),
  threadId: Id<"threads">
) {
  const thread = await getOwnedThread(ctx, threadId)
  const shares = await ctx.db
    .query("threadShares")
    .withIndex("by_threadId", (query) => query.eq("threadId", thread._id))
    .take(MAX_SHARES_PER_THREAD)

  return shares
    .filter((share) => share.revokedAt == null)
    .sort((left, right) => right.createdAt - left.createdAt)
}

export async function createThreadShare(
  ctx: ViewerMutationCtx,
  threadId: Id<"threads">
): Promise<Doc<"threadShares">> {
  const thread = await getOwnedThread(ctx, threadId)
  if (thread.state !== "active") throw new ConvexError("Thread not found")
  if (!thread.hasMessages) throw new ConvexError("Chat is empty")

  const existing = await ctx.db
    .query("threadShares")
    .withIndex("by_threadId", (query) => query.eq("threadId", thread._id))
    .take(MAX_SHARES_PER_THREAD)
  const activeCount = existing.filter((share) => share.revokedAt == null).length
  if (activeCount >= MAX_SHARES_PER_THREAD) {
    throw new ConvexError("Share limit reached")
  }

  const now = Date.now()
  const publicId = await allocatePublicId(ctx)
  const shareId = await ctx.db.insert("threadShares", {
    ownerId: ctx.viewerId,
    threadId: thread._id,
    publicId,
    autoUpdate: false,
    includeAttachments: true,
    snapshotAt: now,
    viewCount: 0,
    forkCount: 0,
    createdAt: now,
  })

  const share = await ctx.db.get("threadShares", shareId)
  if (!share) throw new ConvexError("Share not found")
  return share
}

export async function getOwnedShare(
  ctx: ViewerMutationCtx,
  shareId: Id<"threadShares">
): Promise<Doc<"threadShares">> {
  const share = await ctx.db.get("threadShares", shareId)
  if (!share || share.ownerId !== ctx.viewerId || share.revokedAt != null) {
    throw new ConvexError("Share not found")
  }
  return share
}

export async function listVisibleShareMessages(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  share: Doc<"threadShares">
): Promise<ShareMessage[] | null> {
  const thread = await ctx.db.get("threads", share.threadId)
  if (!thread || thread.state !== "active") return null

  const recent = await ctx.db
    .query("messages")
    .withIndex("by_threadId_and_sequence", (query) =>
      query.eq("threadId", thread._id)
    )
    .order("desc")
    .take(MAX_THREAD_MESSAGES)

  const chronological = recent
    .reverse()
    .filter((message) => share.autoUpdate || message.createdAt <= share.snapshotAt)

  const messages: ShareMessage[] = []
  for (const message of chronological) {
    const attachments: ShareAttachment[] = []
    if (message.role === "user") {
      const docs = await ctx.db
        .query("attachments")
        .withIndex("by_threadId_and_messageId", (query) =>
          query.eq("threadId", thread._id).eq("messageId", message.messageId)
        )
        .take(MAX_ATTACHMENTS_PER_MESSAGE)

      for (const attachment of docs) {
        if (attachment.status !== "ready") continue
        attachments.push({
          attachmentId: attachment.attachmentId,
          messageId: message.messageId,
          filename: attachment.filename,
          kind: attachment.kind,
          mimeType: attachment.mimeType,
        })
      }
    }

    messages.push({
      messageId: message.messageId,
      role: message.role,
      content: message.content,
      thinking: message.thinking,
      status: message.status,
      createdAt: message.createdAt,
      sources: message.sources,
      searchQueries: message.searchQueries,
      thinkingSearchSplitAt: message.thinkingSearchSplitAt,
      generation: message.generation,
      attachments,
    })
  }

  return messages
}

export async function authorizeShareAttachment(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  publicId: string,
  attachmentId: string
) {
  const share = await getShareByPublicId(ctx, publicId)
  if (!share || !share.includeAttachments) return null

  const messages = await listVisibleShareMessages(ctx, share)
  if (!messages) return null

  const listed = messages.some((message) =>
    message.attachments.some(
      (attachment) => attachment.attachmentId === attachmentId
    )
  )
  if (!listed) return null

  const thread = await ctx.db.get("threads", share.threadId)
  if (!thread) return null

  const attachment = await ctx.db
    .query("attachments")
    .withIndex("by_ownerId_and_attachmentId", (query) =>
      query.eq("ownerId", share.ownerId).eq("attachmentId", attachmentId)
    )
    .unique()

  if (!attachment || attachment.status !== "ready") return null
  return {
    objectKey: attachment.objectKey,
    mimeType: attachment.mimeType,
    filename: attachment.filename,
    kind: attachment.kind,
  }
}

export async function forkThreadFromShare(
  ctx: ViewerMutationCtx,
  publicId: string
): Promise<Id<"threads">> {
  const share = await getShareByPublicId(ctx, publicId)
  if (!share) throw new ConvexError("Share not found")

  const thread = await ctx.db.get("threads", share.threadId)
  if (!thread || thread.state !== "active") {
    throw new ConvexError("Share not found")
  }

  const messages = await listVisibleShareMessages(ctx, share)
  if (!messages || messages.length === 0) {
    throw new ConvexError("Chat is empty")
  }

  const now = Date.now()
  const lastMessage = messages[messages.length - 1]
  const threadId = await ctx.db.insert("threads", {
    ownerId: ctx.viewerId,
    title: thread.title || DEFAULT_THREAD_TITLE,
    titleSource: thread.titleSource === "pending" ? "derived" : thread.titleSource,
    state: "active",
    updatedAt: now,
    isPinned: false,
    hasMessages: true,
    messageCount: messages.length,
    nextSequence: messages.length,
    branchedFromThreadId: thread._id,
    branchedFromMessageId: lastMessage?.messageId,
  })

  let sequence = 0
  for (const message of messages) {
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

    if (share.includeAttachments && message.role === "user") {
      for (const listed of message.attachments) {
        const source = await ctx.db
          .query("attachments")
          .withIndex("by_ownerId_and_attachmentId", (query) =>
            query
              .eq("ownerId", share.ownerId)
              .eq("attachmentId", listed.attachmentId)
          )
          .unique()
        if (!source || source.status !== "ready") continue
        await cloneReadyAttachmentForFork(ctx, source, {
          threadId,
          messageId,
        })
      }
    }

    sequence += 1
  }

  await ctx.db.patch("threadShares", share._id, {
    forkCount: share.forkCount + 1,
  })

  return threadId
}

export async function deleteSharesForThread(
  ctx: MutationCtx,
  threadId: Id<"threads">
) {
  const shares = await ctx.db
    .query("threadShares")
    .withIndex("by_threadId", (query) => query.eq("threadId", threadId))
    .take(MAX_SHARES_PER_THREAD)

  for (const share of shares) {
    await ctx.db.delete("threadShares", share._id)
  }
}

async function allocatePublicId(ctx: MutationCtx) {
  for (let attempt = 0; attempt < SHARE_PUBLIC_ID_ATTEMPTS; attempt += 1) {
    const publicId = createSharePublicId()
    const existing = await ctx.db
      .query("threadShares")
      .withIndex("by_publicId", (query) => query.eq("publicId", publicId))
      .unique()
    if (!existing) return publicId
  }

  throw new ConvexError("Could not create a share link")
}
