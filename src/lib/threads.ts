import type { UIMessage } from "@tanstack/ai-react"

import type { Doc } from "../../convex/_generated/dataModel"
import type { WebSearchSource } from "@/lib/web-search"

export type AssistantGenerationStats = {
  modelId?: string
  modelName: string
  mode: string
  outputTokens: number
  tokensPerSecond: number
  timeToFirstTokenSeconds: number
  promptTokens?: number
  cachedTokens?: number
  cacheWriteTokens?: number
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  cacheReadCostPerMillion?: number
  cacheReadEstimated?: boolean
  promptTokensEstimated?: boolean
}

export type ChatThread = {
  id: string
  title: string
  titleSource: "pending" | "generated" | "derived" | "manual"
  isStreaming: boolean
  createdAt: number
  updatedAt: number
  messages: UIMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  webSearchSources: Record<string, WebSearchSource[]>
  webSearchQueries: Record<string, string[]>
  thinkingSearchSplitAt: Record<string, number>
  pinnedAt?: number
  isTemporary?: boolean
  branchedFromThreadId?: string
}

export function createPendingChatThread(id: string): ChatThread {
  return {
    id,
    title: "New Chat",
    titleSource: "derived",
    isStreaming: false,
    createdAt: 0,
    updatedAt: 0,
    messages: [],
    generationStats: {},
    webSearchSources: {},
    webSearchQueries: {},
    thinkingSearchSplitAt: {},
  }
}

const shortTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
})

function toChatMessage(message: Doc<"messages">): UIMessage {
  const legacyParts = message.parts ?? []
  const content =
    message.content ??
    legacyParts
      .filter((part) => part.type === "text")
      .map((part) => part.content)
      .join("\n")
      .trim()
  const thinking =
    message.thinking ??
    legacyParts
      .filter((part) => part.type === "thinking")
      .map((part) => part.content)
      .join("\n")
      .trim()

  return {
    id: message.messageId,
    role: message.role,
    parts: [
      ...(thinking ? [{ type: "thinking" as const, content: thinking }] : []),
      ...(content ? [{ type: "text" as const, content }] : []),
    ],
    createdAt: new Date(message.createdAt),
  }
}

export function toChatMessages(messages: Doc<"messages">[]): UIMessage[] {
  return messages.map(toChatMessage)
}

export function chatMessageText(message: UIMessage) {
  let text = ""
  for (const part of message.parts) {
    if (part.type === "text") text += part.content
  }
  return text
}

/**
 * Whether a message has anything to show yet. Cheaper than building its text,
 * which matters on the streaming path where this runs per chunk.
 */
export function chatMessageHasContent(message: UIMessage) {
  return message.parts.some(
    (part) => "content" in part && part.content.length > 0
  )
}

export function chatMessageThinking(message: UIMessage) {
  const parts: string[] = []
  for (const part of message.parts) {
    if (part.type === "thinking") parts.push(part.content)
  }
  return parts.join("\n").trim()
}

function toAssistantGenerationStats(
  message: Doc<"messages">
): AssistantGenerationStats | null {
  const generation = message.generation
  if (!generation) return null

  const generationSeconds = Math.max(
    (generation.durationMs - generation.timeToFirstTokenMs) / 1000,
    0.001
  )

  return {
    modelId: generation.modelId,
    modelName: generation.modelName,
    mode: `${generation.reasoningEffort.charAt(0).toUpperCase()}${generation.reasoningEffort.slice(1)}`,
    outputTokens: generation.outputTokens,
    tokensPerSecond: generation.outputTokens / generationSeconds,
    timeToFirstTokenSeconds: generation.timeToFirstTokenMs / 1000,
    promptTokens: generation.promptTokens,
    cachedTokens: generation.cachedTokens,
    cacheWriteTokens: generation.cacheWriteTokens,
    inputCostPerMillion: generation.inputCostPerMillion,
    outputCostPerMillion: generation.outputCostPerMillion,
    cacheReadCostPerMillion: generation.cacheReadCostPerMillion,
    cacheReadEstimated: generation.cacheReadEstimated,
    promptTokensEstimated: generation.promptTokensEstimated,
  }
}

function isSameChatMessage(left: UIMessage, right: UIMessage) {
  if (
    left.role !== right.role ||
    left.parts.length !== right.parts.length ||
    Number(left.createdAt) !== Number(right.createdAt)
  ) {
    return false
  }

  return left.parts.every((part, index) => {
    const other = right.parts[index]
    if (part.type !== other.type) return false
    const leftContent = "content" in part ? part.content : null
    const rightContent = "content" in other ? other.content : null
    return leftContent === rightContent
  })
}

function isSameGenerationStats(
  left: AssistantGenerationStats,
  right: AssistantGenerationStats
) {
  return (
    left.modelId === right.modelId &&
    left.modelName === right.modelName &&
    left.mode === right.mode &&
    left.outputTokens === right.outputTokens &&
    left.tokensPerSecond === right.tokensPerSecond &&
    left.timeToFirstTokenSeconds === right.timeToFirstTokenSeconds &&
    left.promptTokens === right.promptTokens &&
    left.cachedTokens === right.cachedTokens &&
    left.cacheWriteTokens === right.cacheWriteTokens &&
    left.inputCostPerMillion === right.inputCostPerMillion &&
    left.outputCostPerMillion === right.outputCostPerMillion &&
    left.cacheReadCostPerMillion === right.cacheReadCostPerMillion &&
    left.cacheReadEstimated === right.cacheReadEstimated &&
    left.promptTokensEstimated === right.promptTokensEstimated
  )
}

function isSameOrder<T>(left: T[], right: T[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

function isSameSet<T>(left: ReadonlySet<T>, right: ReadonlySet<T>) {
  return left.size === right.size && [...left].every((item) => right.has(item))
}

function isSameSources(left: WebSearchSource[], right: WebSearchSource[]) {
  return (
    left.length === right.length &&
    left.every(
      (source, index) =>
        source.url === right[index]?.url && source.title === right[index]?.title
    )
  )
}

function isSameStringList(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function isSameRecord<T>(left: Record<string, T>, right: Record<string, T>) {
  const leftKeys = Object.keys(left)
  return (
    leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => left[key] === right[key])
  )
}

export type MessageProjectionCache = {
  messages: (documents: Doc<"messages">[]) => UIMessage[]
  generationStats: (
    documents: Doc<"messages">[]
  ) => Record<string, AssistantGenerationStats>
  webSearchSources: (
    documents: Doc<"messages">[]
  ) => Record<string, WebSearchSource[]>
  webSearchQueries: (documents: Doc<"messages">[]) => Record<string, string[]>
  thinkingSearchSplitAt: (documents: Doc<"messages">[]) => Record<string, number>
  stoppedMessageIds: (documents: Doc<"messages">[]) => ReadonlySet<string>
}

/**
 * Convex re-parses documents on every subscription update, so projecting them
 * fresh hands each message row a new prop identity and defeats its memo — an
 * unrelated title patch would then re-render every finished message. Reuse the
 * previous projection whenever the underlying values are unchanged, and the
 * previous collection whenever nothing in it moved.
 *
 * Scoped per hook instance rather than module-global so entries die with the
 * component instead of accumulating for every thread visited.
 */
export function createMessageProjectionCache(): MessageProjectionCache {
  let messageCache = new Map<string, UIMessage>()
  let statsCache = new Map<string, AssistantGenerationStats>()
  let lastMessages: UIMessage[] = []
  // SAFETY: accumulator starts empty and is filled only with projected generation stats.
  let lastStats = {} as {
    [messageId: string]: AssistantGenerationStats
  }
  let lastStoppedIds: ReadonlySet<string> = new Set()
  let sourcesCache = new Map<string, WebSearchSource[]>()
  // SAFETY: accumulator starts empty and is filled only with projected sources.
  let lastSources = {} as { [messageId: string]: WebSearchSource[] }
  let queriesCache = new Map<string, string[]>()
  // SAFETY: accumulator starts empty and is filled only with projected queries.
  let lastQueries = {} as { [messageId: string]: string[] }
  let splitAtCache = new Map<string, number>()
  // SAFETY: accumulator starts empty and is filled only with projected split offsets.
  let lastSplitAt = {} as { [messageId: string]: number }

  return {
    messages(documents) {
      const nextCache = new Map<string, UIMessage>()
      const next = documents.map((document) => {
        const projected = toChatMessage(document)
        const previous = messageCache.get(projected.id)
        const value =
          previous && isSameChatMessage(previous, projected)
            ? previous
            : projected
        nextCache.set(projected.id, value)
        return value
      })

      messageCache = nextCache
      if (isSameOrder(lastMessages, next)) return lastMessages
      lastMessages = next
      return next
    },

    generationStats(documents) {
      const nextCache = new Map<string, AssistantGenerationStats>()
      // SAFETY: accumulator starts empty and is filled only with projected generation stats.
      const next = {} as { [messageId: string]: AssistantGenerationStats }
      for (const document of documents) {
        const projected = toAssistantGenerationStats(document)
        if (!projected) continue
        const previous = statsCache.get(document.messageId)
        const value =
          previous && isSameGenerationStats(previous, projected)
            ? previous
            : projected
        nextCache.set(document.messageId, value)
        next[document.messageId] = value
      }

      statsCache = nextCache
      if (isSameRecord(lastStats, next)) return lastStats
      lastStats = next
      return next
    },

    webSearchSources(documents) {
      const nextCache = new Map<string, WebSearchSource[]>()
      // SAFETY: accumulator starts empty and is filled only with projected sources.
      const next = {} as { [messageId: string]: WebSearchSource[] }
      for (const document of documents) {
        const projected = document.sources
        if (!projected || projected.length === 0) continue
        const previous = sourcesCache.get(document.messageId)
        const value =
          previous && isSameSources(previous, projected) ? previous : projected
        nextCache.set(document.messageId, value)
        next[document.messageId] = value
      }

      sourcesCache = nextCache
      if (isSameRecord(lastSources, next)) return lastSources
      lastSources = next
      return next
    },

    webSearchQueries(documents) {
      const nextCache = new Map<string, string[]>()
      // SAFETY: accumulator starts empty and is filled only with projected queries.
      const next = {} as { [messageId: string]: string[] }
      for (const document of documents) {
        const projected = document.searchQueries
        if (!projected || projected.length === 0) continue
        const previous = queriesCache.get(document.messageId)
        const value =
          previous && isSameStringList(previous, projected)
            ? previous
            : projected
        nextCache.set(document.messageId, value)
        next[document.messageId] = value
      }

      queriesCache = nextCache
      if (isSameRecord(lastQueries, next)) return lastQueries
      lastQueries = next
      return next
    },

    thinkingSearchSplitAt(documents) {
      const nextCache = new Map<string, number>()
      // SAFETY: accumulator starts empty and is filled only with projected split offsets.
      const next = {} as { [messageId: string]: number }
      for (const document of documents) {
        const projected = document.thinkingSearchSplitAt
        if (projected === undefined || !Number.isInteger(projected) || projected < 0) {
          continue
        }
        const previous = splitAtCache.get(document.messageId)
        const value = previous === projected ? previous : projected
        nextCache.set(document.messageId, value)
        next[document.messageId] = value
      }

      splitAtCache = nextCache
      if (isSameRecord(lastSplitAt, next)) return lastSplitAt
      lastSplitAt = next
      return next
    },

    stoppedMessageIds(documents) {
      const next = new Set<string>()
      for (const document of documents) {
        if (document.status === "stopped") next.add(document.messageId)
      }

      if (isSameSet(lastStoppedIds, next)) return lastStoppedIds
      lastStoppedIds = next
      return next
    },
  }
}

/**
 * The panel's view of a thread. isStreaming is absent rather than false:
 * liveness comes from the sidebar's running-run subscription, which the panel
 * deliberately does not hold, and the panel reads its own useChat instead.
 */
export type ActiveChatThread = Omit<ChatThread, "isStreaming">

export function toActiveChatThread(
  thread: Doc<"threads">,
  messages: UIMessage[] = [],
  generationStats: Record<string, AssistantGenerationStats> = {},
  webSearchSources: Record<string, WebSearchSource[]> = {},
  webSearchQueries: Record<string, string[]> = {},
  thinkingSearchSplitAt: Record<string, number> = {}
): ActiveChatThread {
  return {
    id: thread._id,
    title: thread.title,
    titleSource: thread.titleSource,
    createdAt: thread._creationTime,
    updatedAt: thread.updatedAt,
    messages,
    generationStats,
    webSearchSources,
    webSearchQueries,
    thinkingSearchSplitAt,
    pinnedAt: thread.pinnedAt,
    branchedFromThreadId: thread.branchedFromThreadId,
  }
}

export function toChatThread(
  thread: Doc<"threads">,
  messages: UIMessage[] = [],
  generationStats: Record<string, AssistantGenerationStats> = {},
  isStreaming = false,
  webSearchSources: Record<string, WebSearchSource[]> = {},
  webSearchQueries: Record<string, string[]> = {},
  thinkingSearchSplitAt: Record<string, number> = {}
): ChatThread {
  return {
    ...toActiveChatThread(
      thread,
      messages,
      generationStats,
      webSearchSources,
      webSearchQueries,
      thinkingSearchSplitAt
    ),
    isStreaming,
  }
}

export function formatShortTimestamp(
  value: Date | number | string | undefined
) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return shortTimeFormatter.format(date)
}
