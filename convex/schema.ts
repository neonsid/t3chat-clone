import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const messagePartValidator = v.union(
  v.object({
    type: v.literal("text"),
    content: v.string(),
  }),
  v.object({
    type: v.literal("thinking"),
    content: v.string(),
  })
)

export const reasoningEffortValidator = v.union(
  v.literal("instant"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
)

export const generationValidator = v.object({
  modelId: v.string(),
  modelName: v.string(),
  reasoningEffort: reasoningEffortValidator,
  outputTokens: v.number(),
  durationMs: v.number(),
  timeToFirstTokenMs: v.number(),
})

export default defineSchema({
  threads: defineTable({
    ownerId: v.string(),
    title: v.string(),
    titleSource: v.union(
      v.literal("pending"),
      v.literal("generated"),
      v.literal("derived"),
      v.literal("manual")
    ),
    state: v.union(
      v.literal("active"),
      v.literal("archived"),
      v.literal("deleting")
    ),
    updatedAt: v.number(),
    isPinned: v.boolean(),
    pinnedAt: v.optional(v.number()),
    hasMessages: v.boolean(),
    messageCount: v.number(),
    nextSequence: v.number(),
  })
    .index("by_ownerId_and_state_and_updatedAt", [
      "ownerId",
      "state",
      "updatedAt",
    ])
    .index("by_ownerId_and_state_and_hasMessages_and_isPinned_and_updatedAt", [
      "ownerId",
      "state",
      "hasMessages",
      "isPinned",
      "updatedAt",
    ])
    .index("by_ownerId_and_state_and_hasMessages_and_isPinned_and_pinnedAt", [
      "ownerId",
      "state",
      "hasMessages",
      "isPinned",
      "pinnedAt",
    ])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "state", "hasMessages"],
    }),

  messages: defineTable({
    threadId: v.id("threads"),
    messageId: v.string(),
    sequence: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.optional(v.string()),
    thinking: v.optional(v.string()),
    // Deprecated migration field. New messages use the scalar text fields.
    parts: v.optional(v.array(messagePartValidator)),
    status: v.union(
      v.literal("complete"),
      v.literal("stopped"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    generation: v.optional(generationValidator),
  })
    .index("by_threadId_and_sequence", ["threadId", "sequence"])
    .index("by_threadId_and_messageId", ["threadId", "messageId"]),

  chatRuns: defineTable({
    ownerId: v.string(),
    threadId: v.id("threads"),
    runId: v.string(),
    completionSecret: v.string(),
    userMessageId: v.string(),
    assistantMessageId: v.optional(v.string()),
    modelId: v.string(),
    reasoningEffort: reasoningEffortValidator,
    status: v.union(
      v.literal("running"),
      v.literal("complete"),
      v.literal("stopped"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_threadId_and_status", ["threadId", "status"])
    .index("by_threadId_and_runId", ["threadId", "runId"])
    .index("by_ownerId_and_status", ["ownerId", "status"]),

  preferences: defineTable({
    ownerId: v.string(),
    selectedModelId: v.string(),
    favoriteModelIds: v.array(v.string()),
    combineResults: v.boolean(),
  }).index("by_ownerId", ["ownerId"]),
})
