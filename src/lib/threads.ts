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

export function toChatMessages(messages: Doc<"messages">[]): UIMessage[] {
  return messages.map((message) => {
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
  })
}

export function toGenerationStats(
  messages: Doc<"messages">[]
): Record<string, AssistantGenerationStats> {
  return Object.fromEntries(
    messages.flatMap((message) => {
      const generation = message.generation
      if (!generation) return []
      const generationSeconds = Math.max(
        (generation.durationMs - generation.timeToFirstTokenMs) / 1000,
        0.001
      )
      return [
        [
          message.messageId,
          {
            modelName: generation.modelName,
            mode: `${generation.reasoningEffort.charAt(0).toUpperCase()}${generation.reasoningEffort.slice(1)}`,
            outputTokens: generation.outputTokens,
            tokensPerSecond: generation.outputTokens / generationSeconds,
            timeToFirstTokenSeconds: generation.timeToFirstTokenMs / 1000,
          },
        ],
      ]
    })
  )
}

export function toChatThread(
  thread: Doc<"threads">,
  messages: UIMessage[] = [],
  generationStats: Record<string, AssistantGenerationStats> = {}
): ChatThread {
  return {
    id: thread._id,
    title: thread.title,
    createdAt: thread._creationTime,
    updatedAt: thread.updatedAt,
    messages,
    generationStats,
    pinnedAt: thread.pinnedAt,
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
