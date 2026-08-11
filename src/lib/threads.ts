import type { UIMessage } from "@tanstack/ai-react"

import type { Doc } from "../../convex/_generated/dataModel"

export type AssistantGenerationStats = {
  modelName: string
  mode: string
  outputTokens: number
  tokensPerSecond: number
  timeToFirstTokenSeconds: number
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
  pinnedAt?: number
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
    modelName: generation.modelName,
    mode: `${generation.reasoningEffort.charAt(0).toUpperCase()}${generation.reasoningEffort.slice(1)}`,
    outputTokens: generation.outputTokens,
    tokensPerSecond: generation.outputTokens / generationSeconds,
    timeToFirstTokenSeconds: generation.timeToFirstTokenMs / 1000,
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
    left.modelName === right.modelName &&
    left.mode === right.mode &&
    left.outputTokens === right.outputTokens &&
    left.tokensPerSecond === right.tokensPerSecond &&
    left.timeToFirstTokenSeconds === right.timeToFirstTokenSeconds
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
  let lastStats: Record<string, AssistantGenerationStats> = {}
  let lastStoppedIds: ReadonlySet<string> = new Set()

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
      const next: Record<string, AssistantGenerationStats> = {}
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
  generationStats: Record<string, AssistantGenerationStats> = {}
): ActiveChatThread {
  return {
    id: thread._id,
    title: thread.title,
    titleSource: thread.titleSource,
    createdAt: thread._creationTime,
    updatedAt: thread.updatedAt,
    messages,
    generationStats,
    pinnedAt: thread.pinnedAt,
  }
}

export function toChatThread(
  thread: Doc<"threads">,
  messages: UIMessage[] = [],
  generationStats: Record<string, AssistantGenerationStats> = {},
  isStreaming = false
): ChatThread {
  return {
    ...toActiveChatThread(thread, messages, generationStats),
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
