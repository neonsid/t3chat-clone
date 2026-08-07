import { ConvexError, v } from "convex/values"

import {
  MAX_CHAT_IDENTIFIER_LENGTH,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_THREAD_MESSAGES,
  RUN_LEASE_DURATION_MS,
} from "./constants"
import { authedMutation } from "./helpers/functions"
import { getOwnedThread, titleFromFirstMessage } from "./helpers/threads"
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
    if (!content) throw new ConvexError("Message cannot be empty")
    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      throw new ConvexError("Message is too long")
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
        content,
        status: "complete",
        createdAt: now,
      })
      nextSequence += 1
      messageCount += 1
    }

    await ctx.db.patch("threads", thread._id, {
      title:
        !thread.hasMessages && thread.titleSource === "derived"
          ? titleFromFirstMessage(content)
          : thread.title,
      updatedAt: now,
      hasMessages: true,
      messageCount,
      nextSequence,
    })
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

export const fail = authedMutation({
  args: { ...finishArgs, errorMessage: v.string() },
  handler: async (ctx, args) => await finishRun(ctx, args, "failed"),
})
