import { ConvexError, v } from "convex/values"

import { internalQuery, mutation, query } from "./_generated/server"
import {
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_SHARES_PER_THREAD,
} from "./constants"
import { authedMutation, authedQuery } from "./helpers/functions"
import { getOwnedThread } from "./helpers/threads"
import {
  authorizeShareAttachment,
  createThreadShare,
  forkThreadFromShare,
  getOwnedShare,
  getShareByPublicId,
  listOwnedThreadShares,
  listVisibleShareMessages,
} from "./helpers/threadShares"
import type { Doc, Id } from "./_generated/dataModel"
import { attachmentKindValidator, generationValidator } from "./schema"

const shareSummaryValidator = v.object({
  _id: v.id("threadShares"),
  threadId: v.id("threads"),
  publicId: v.string(),
  autoUpdate: v.boolean(),
  includeAttachments: v.boolean(),
  snapshotAt: v.number(),
  viewCount: v.number(),
  forkCount: v.number(),
  createdAt: v.number(),
})

const shareAttachmentValidator = v.object({
  attachmentId: v.string(),
  messageId: v.string(),
  filename: v.string(),
  kind: attachmentKindValidator,
  mimeType: v.string(),
})

const shareMessageValidator = v.object({
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
  sources: v.optional(
    v.array(v.object({ title: v.string(), url: v.string() }))
  ),
  searchQueries: v.optional(v.array(v.string())),
  thinkingSearchSplitAt: v.optional(v.number()),
  generation: v.optional(generationValidator),
  attachments: v.array(shareAttachmentValidator),
})

function toShareSummary(share: Doc<"threadShares">) {
  return {
    _id: share._id,
    threadId: share.threadId,
    publicId: share.publicId,
    autoUpdate: share.autoUpdate,
    includeAttachments: share.includeAttachments,
    snapshotAt: share.snapshotAt,
    viewCount: share.viewCount,
    forkCount: share.forkCount,
    createdAt: share.createdAt,
  }
}

export const listForThread = authedQuery({
  args: { threadId: v.id("threads") },
  returns: v.array(shareSummaryValidator),
  handler: async (ctx, args) => {
    const shares = await listOwnedThreadShares(ctx, args.threadId)
    return shares.map(toShareSummary)
  },
})

export const listByOwner = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      threadId: v.id("threads"),
      title: v.string(),
      shares: v.array(shareSummaryValidator),
    })
  ),
  handler: async (ctx) => {
    const shares = await ctx.db
      .query("threadShares")
      .withIndex("by_ownerId_and_createdAt", (query) =>
        query.eq("ownerId", ctx.viewerId)
      )
      .order("desc")
      .take(MAX_SHARES_PER_THREAD * 20)

    const groups = new Map<
      string,
      {
        threadId: Id<"threads">
        title: string
        shares: Array<ReturnType<typeof toShareSummary>>
      }
    >()

    for (const share of shares) {
      if (share.revokedAt != null) continue
      const existing = groups.get(share.threadId)
      if (existing) {
        existing.shares.push(toShareSummary(share))
        continue
      }

      const thread = await ctx.db.get("threads", share.threadId)
      groups.set(share.threadId, {
        threadId: share.threadId,
        title: thread?.title ?? "New chat",
        shares: [toShareSummary(share)],
      })
    }

    return [...groups.values()]
  },
})

export const create = authedMutation({
  args: { threadId: v.id("threads") },
  returns: shareSummaryValidator,
  handler: async (ctx, args) => {
    return toShareSummary(await createThreadShare(ctx, args.threadId))
  },
})

export const update = authedMutation({
  args: {
    shareId: v.id("threadShares"),
    autoUpdate: v.optional(v.boolean()),
    includeAttachments: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const share = await getOwnedShare(ctx, args.shareId)
    await ctx.db.patch("threadShares", share._id, {
      autoUpdate: args.autoUpdate ?? share.autoUpdate,
      includeAttachments: args.includeAttachments ?? share.includeAttachments,
    })
    return null
  },
})

export const refreshSnapshot = authedMutation({
  args: { shareId: v.id("threadShares") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const share = await getOwnedShare(ctx, args.shareId)
    await getOwnedThread(ctx, share.threadId)
    await ctx.db.patch("threadShares", share._id, {
      snapshotAt: Date.now(),
    })
    return null
  },
})

export const remove = authedMutation({
  args: { shareId: v.id("threadShares") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const share = await getOwnedShare(ctx, args.shareId)
    await ctx.db.patch("threadShares", share._id, {
      revokedAt: Date.now(),
    })
    return null
  },
})

export const forkFromShare = authedMutation({
  args: { publicId: v.string() },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    if (args.publicId.length > MAX_CHAT_IDENTIFIER_LENGTH) {
      throw new ConvexError("Share not found")
    }
    return await forkThreadFromShare(ctx, args.publicId)
  },
})

export const getByPublicId = query({
  args: { publicId: v.string() },
  returns: v.union(
    v.object({
      publicId: v.string(),
      title: v.string(),
      autoUpdate: v.boolean(),
      includeAttachments: v.boolean(),
      messages: v.array(shareMessageValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const share = await getShareByPublicId(ctx, args.publicId)
    if (!share) return null

    const thread = await ctx.db.get("threads", share.threadId)
    if (!thread || thread.state !== "active") return null

    const messages = await listVisibleShareMessages(ctx, share)
    if (!messages) return null

    return {
      publicId: share.publicId,
      title: thread.title,
      autoUpdate: share.autoUpdate,
      includeAttachments: share.includeAttachments,
      messages: share.includeAttachments
        ? messages
        : messages.map((message) => ({
            ...message,
            attachments: message.attachments.map((attachment) => ({
              ...attachment,
            })),
          })),
    }
  },
})

export const recordView = mutation({
  args: { publicId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const share = await getShareByPublicId(ctx, args.publicId)
    if (!share) return null
    await ctx.db.patch("threadShares", share._id, {
      viewCount: share.viewCount + 1,
    })
    return null
  },
})

export const authorizeDownload = internalQuery({
  args: {
    publicId: v.string(),
    attachmentId: v.string(),
  },
  returns: v.union(
    v.object({
      objectKey: v.string(),
      mimeType: v.string(),
      filename: v.string(),
      kind: attachmentKindValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await authorizeShareAttachment(ctx, args.publicId, args.attachmentId)
  },
})
