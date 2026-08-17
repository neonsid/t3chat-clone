import { v } from "convex/values"

import { internal } from "./_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server"
import {
  DEFAULT_THREAD_TITLE,
  MAX_THREAD_TITLE_LENGTH,
} from "./constants"
import { generateThreadTitle } from "./helpers/generateThreadTitle"
import { getMessageContent } from "./helpers/messages"
import { sanitizeGeneratedTitle } from "./helpers/threads"

export const getTitleContext = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.state !== "active") return null
    if (thread.titleSource !== "pending") return null

    const firstMessage = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_sequence", (query) =>
        query.eq("threadId", thread._id)
      )
      .order("asc")
      .first()

    if (!firstMessage) return null

    const firstText = getMessageContent(firstMessage)
    if (firstText.trim()) {
      return {
        threadId: thread._id,
        firstMessage: firstText.slice(0, MAX_THREAD_TITLE_LENGTH * 8),
      }
    }

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_threadId_and_messageId", (query) =>
        query
          .eq("threadId", thread._id)
          .eq("messageId", firstMessage.messageId)
      )
      .take(5)

    if (attachments.length === 0) return null

    const filenames = attachments.map((attachment) => attachment.filename)
    const allImages = attachments.every(
      (attachment) => attachment.kind === "image"
    )
    const allPdfs = attachments.every(
      (attachment) => attachment.kind === "pdf"
    )
    const titleSeed =
      filenames.length === 1
        ? filenames[0]!
        : allImages
          ? "Images"
          : allPdfs
            ? "PDFs"
            : filenames.slice(0, 2).join(", ")

    return {
      threadId: thread._id,
      firstMessage: titleSeed.slice(0, MAX_THREAD_TITLE_LENGTH * 8),
    }
  },
})

export const applyGeneratedTitle = internalMutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
    source: v.union(v.literal("generated"), v.literal("derived")),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.state !== "active") return null
    if (thread.titleSource !== "pending") return null

    const title = sanitizeGeneratedTitle(args.title)
    await ctx.db.patch("threads", thread._id, {
      title: title || DEFAULT_THREAD_TITLE,
      titleSource: args.source,
    })
    return null
  },
})

export const generate = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.threadTitles.getTitleContext, {
      threadId: args.threadId,
    })
    if (!context) return null

    const result = await generateThreadTitle(context.firstMessage)
    await ctx.runMutation(internal.threadTitles.applyGeneratedTitle, {
      threadId: context.threadId,
      title: result.title,
      source: result.source,
    })
    return null
  },
})
