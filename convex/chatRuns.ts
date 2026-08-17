import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { MAX_ATTACHMENTS_PER_MESSAGE } from "./attachmentConstants"
import {
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_RUNNING_THREAD_IDS,
  MAX_THREAD_MESSAGES,
  RUN_LEASE_DURATION_MS,
} from "./constants"
import { authedMutation, authedQuery } from "./helpers/functions"
import { getOwnedThread } from "./helpers/threads"
import { generationValidator, reasoningEffortValidator } from "./schema"
import type { MutationCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

async function getRun(
  ctx: ViewerMutationCtx,
  threadId: Id<"threads">,
  runId: string,
  completionSecret: string
) {
  const run = await ctx.db
    .query("chatRuns")
    .withIndex("by_threadId_and_runId", (query) =>
      query.eq("threadId", threadId).eq("runId", runId)
    )
    .unique()

  if (
    !run ||
    run.ownerId !== ctx.viewerId ||
    run.completionSecret !== completionSecret
  ) {
    throw new ConvexError("Chat run not found")
  }
  return run
}

async function saveAssistantMessage(
  ctx: ViewerMutationCtx,
  thread: Doc<"threads">,
  messageId: string | undefined,
  content: string,
  thinking: string,
  status: "complete" | "stopped" | "failed",
  generation:
    | {
        modelId: string
        modelName: string
        reasoningEffort: "instant" | "low" | "medium" | "high"
        outputTokens: number
        durationMs: number
        timeToFirstTokenMs: number
      }
    | undefined
) {
  if (!messageId || (!content && !thinking)) return

  const existingMessage = await ctx.db
    .query("messages")
    .withIndex("by_threadId_and_messageId", (query) =>
      query.eq("threadId", thread._id).eq("messageId", messageId)
    )
    .unique()
  if (existingMessage) return

  await ctx.db.insert("messages", {
    threadId: thread._id,
    messageId,
    sequence: thread.nextSequence,
    role: "assistant",
    content,
    thinking: thinking || undefined,
    status,
    createdAt: Date.now(),
    generation,
  })
  await ctx.db.patch("threads", thread._id, {
    updatedAt: Date.now(),
    messageCount: thread.messageCount + 1,
    nextSequence: thread.nextSequence + 1,
  })
}

/**
 * Fills in what only the server knows. Used when the client already wrote the
 * message itself, so the content it rendered is left untouched.
 */
async function backfillGeneration(
  ctx: ViewerMutationCtx,
  threadId: Id<"threads">,
  messageId: string | undefined,
  generation: Doc<"messages">["generation"]
) {
  if (!messageId || !generation) return

  const message = await ctx.db
    .query("messages")
    .withIndex("by_threadId_and_messageId", (query) =>
      query.eq("threadId", threadId).eq("messageId", messageId)
    )
    .unique()
  if (!message || message.generation) return

  await ctx.db.patch("messages", message._id, { generation })
}

async function finishRun(
  ctx: ViewerMutationCtx,
  args: {
    threadId: Id<"threads">
    runId: string
    completionSecret: string
    assistantMessageId?: string
    content: string
    thinking?: string
    generation?: {
      modelId: string
      modelName: string
      reasoningEffort: "instant" | "low" | "medium" | "high"
      outputTokens: number
      durationMs: number
      timeToFirstTokenMs: number
    }
    errorMessage?: string
  },
  status: "complete" | "stopped" | "failed"
) {
  const thread = await getOwnedThread(ctx, args.threadId)
  const run = await getRun(
    ctx,
    args.threadId,
    args.runId,
    args.completionSecret
  )
  // A viewer who stopped the run already wrote the answer at the point they
  // saw it, which trails what this stream received by however long the abort
  // took to arrive. Their text stands; only the usage is still missing.
  if (run.status === "stopped") {
    await backfillGeneration(
      ctx,
      thread._id,
      run.assistantMessageId,
      args.generation
    )
    return null
  }
  if (run.status !== "running") return null

  await saveAssistantMessage(
    ctx,
    thread,
    args.assistantMessageId,
    args.content,
    args.thinking ?? "",
    status,
    args.generation
  )
  await ctx.db.patch("chatRuns", run._id, {
    assistantMessageId: args.assistantMessageId,
    status,
    finishedAt: Date.now(),
    errorMessage: args.errorMessage,
  })
  return null
}

export const start = authedMutation({
  args: {
    threadId: v.id("threads"),
    runId: v.string(),
    completionSecret: v.string(),
    userMessageId: v.string(),
    content: v.string(),
    attachmentIds: v.optional(v.array(v.string())),
    modelId: v.string(),
    reasoningEffort: reasoningEffortValidator,
  },
  handler: async (ctx, args) => {
    const thread = await getOwnedThread(ctx, args.threadId)
    if (thread.state !== "active") throw new ConvexError("Thread not found")
    if (
      !args.runId.trim() ||
      !args.completionSecret.trim() ||
      !args.userMessageId.trim() ||
      args.runId.length > MAX_CHAT_IDENTIFIER_LENGTH ||
      args.completionSecret.length > MAX_CHAT_IDENTIFIER_LENGTH ||
      args.userMessageId.length > MAX_CHAT_IDENTIFIER_LENGTH
    ) {
      throw new ConvexError("Invalid chat identifiers")
    }
    if (thread.messageCount + 2 > MAX_THREAD_MESSAGES) {
      throw new ConvexError("This thread has reached its message limit")
    }

    const attachmentIds = args.attachmentIds ?? []
    if (attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new ConvexError("Too many attachments")
    }
    if (new Set(attachmentIds).size !== attachmentIds.length) {
      throw new ConvexError("Duplicate attachment ids")
    }

    const existingRun = await ctx.db
      .query("chatRuns")
      .withIndex("by_threadId_and_runId", (query) =>
        query.eq("threadId", thread._id).eq("runId", args.runId)
      )
      .unique()
    if (existingRun) {
      return { accepted: false, status: existingRun.status }
    }

    const running = await ctx.db
      .query("chatRuns")
      .withIndex("by_threadId_and_status", (query) =>
        query.eq("threadId", thread._id).eq("status", "running")
      )
      .first()
    const now = Date.now()
    if (running) {
      if (now - running.startedAt < RUN_LEASE_DURATION_MS) {
        throw new ConvexError("A response is already being generated")
      }
      await ctx.db.patch("chatRuns", running._id, {
        status: "failed",
        finishedAt: now,
        errorMessage: "Generation lease expired",
      })
    }

    const content = args.content.trim()
    if (!content && attachmentIds.length === 0) {
      throw new ConvexError("Message cannot be empty")
    }
    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      throw new ConvexError("Message is too long")
    }

    const attachments: Array<Doc<"attachments">> = []
    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db
        .query("attachments")
        .withIndex("by_ownerId_and_attachmentId", (query) =>
          query.eq("ownerId", ctx.viewerId).eq("attachmentId", attachmentId)
        )
        .unique()
      if (!attachment) throw new ConvexError("Attachment not found")
      if (attachment.status !== "ready") {
        throw new ConvexError("Attachment is not ready")
      }
      if (attachment.bindingStatus === "bound") {
        if (
          attachment.threadId !== thread._id ||
          attachment.messageId !== args.userMessageId
        ) {
          throw new ConvexError("Attachment is already bound")
        }
      }
      attachments.push(attachment)
    }

    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_threadId_and_messageId", (query) =>
        query.eq("threadId", thread._id).eq("messageId", args.userMessageId)
      )
      .unique()

    let nextSequence = thread.nextSequence
    let messageCount = thread.messageCount
    if (!existingMessage) {
      await ctx.db.insert("messages", {
        threadId: thread._id,
        messageId: args.userMessageId,
        sequence: nextSequence,
        role: "user",
        content: content || undefined,
        status: "complete",
        createdAt: now,
      })
      nextSequence += 1
      messageCount += 1
    }

    for (const attachment of attachments) {
      if (attachment.bindingStatus === "bound") continue
      await ctx.db.patch("attachments", attachment._id, {
        bindingStatus: "bound",
        threadId: thread._id,
        messageId: args.userMessageId,
        expiresAt: undefined,
      })
    }

    const shouldGenerateTitle =
      !thread.hasMessages &&
      (thread.titleSource === "derived" || thread.titleSource === "pending")

    const threadPatch = {
      updatedAt: now,
      hasMessages: true as const,
      messageCount,
      nextSequence,
    }
    await ctx.db.patch(
      "threads",
      thread._id,
      shouldGenerateTitle
        ? { ...threadPatch, titleSource: "pending" as const }
        : threadPatch
    )
    await ctx.db.insert("chatRuns", {
      ownerId: ctx.viewerId,
      threadId: thread._id,
      runId: args.runId,
      completionSecret: args.completionSecret,
      userMessageId: args.userMessageId,
      modelId: args.modelId,
      reasoningEffort: args.reasoningEffort,
      status: "running",
      startedAt: now,
    })
    if (shouldGenerateTitle) {
      await ctx.scheduler.runAfter(0, internal.threadTitles.generate, {
        threadId: thread._id,
      })
    }
    return { accepted: true, status: "running" as const }
  },
})

const finishArgs = {
  threadId: v.id("threads"),
  runId: v.string(),
  completionSecret: v.string(),
  assistantMessageId: v.optional(v.string()),
  content: v.string(),
  thinking: v.optional(v.string()),
  generation: v.optional(generationValidator),
}

export const complete = authedMutation({
  args: finishArgs,
  handler: async (ctx, args) => await finishRun(ctx, args, "complete"),
})

export const stop = authedMutation({
  args: finishArgs,
  handler: async (ctx, args) => await finishRun(ctx, args, "stopped"),
})

/**
 * Ends the thread's running turn at the text the viewer actually saw.
 *
 * The stream keeps arriving for as long as the abort takes to reach the model,
 * so leaving this to the server would store a paragraph the reader never read
 * and watched disappear. Usage is left out because the client cannot know it;
 * the run's own stop call fills that in when it lands.
 */
export const stopFromClient = authedMutation({
  args: {
    threadId: v.id("threads"),
    assistantMessageId: v.optional(v.string()),
    content: v.string(),
    thinking: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      args.assistantMessageId &&
      args.assistantMessageId.length > MAX_CHAT_IDENTIFIER_LENGTH
    ) {
      throw new ConvexError("Invalid chat identifiers")
    }

    const thread = await getOwnedThread(ctx, args.threadId)
    const run = await ctx.db
      .query("chatRuns")
      .withIndex("by_threadId_and_status", (query) =>
        query.eq("threadId", thread._id).eq("status", "running")
      )
      .first()
    if (!run || run.ownerId !== ctx.viewerId) return null

    await saveAssistantMessage(
      ctx,
      thread,
      args.assistantMessageId,
      args.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
      (args.thinking ?? "").slice(0, MAX_MESSAGE_CONTENT_LENGTH),
      "stopped",
      undefined
    )
    await ctx.db.patch("chatRuns", run._id, {
      assistantMessageId: args.assistantMessageId ?? run.assistantMessageId,
      status: "stopped",
      finishedAt: Date.now(),
    })
    return null
  },
})

export const fail = authedMutation({
  args: { ...finishArgs, errorMessage: v.string() },
  handler: async (ctx, args) => await finishRun(ctx, args, "failed"),
})

export const listRunningThreadIds = authedQuery({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("chatRuns")
      .withIndex("by_ownerId_and_status", (query) =>
        query.eq("ownerId", ctx.viewerId).eq("status", "running")
      )
      .take(MAX_RUNNING_THREAD_IDS)

    return [...new Set(runs.map((run) => run.threadId))]
  },
})
