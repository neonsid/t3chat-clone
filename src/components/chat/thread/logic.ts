import type { UIMessage } from "@tanstack/ai-react"

import { WEB_SEARCH_TOOL_CALL } from "@/components/chat/thread/constants"
import { resolveTimelineMinimapPreviewText } from "@/components/chat/timeline/logic"
import type { TimelineMinimapItem } from "@/components/chat/timeline/types"
import type { WebSearchSource } from "@/lib/web-search"

export function messageText(message: UIMessage) {
  let text = ""
  for (const part of message.parts) {
    if (part.type !== "text") continue
    text += `${text ? " " : ""}${part.content}`
  }
  return text
}

export function deriveTimelineMinimapItems(
  messages: UIMessage[]
): TimelineMinimapItem[] {
  const items: TimelineMinimapItem[] = []

  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue

    let assistantText: string | null = null
    for (let nextIndex = index + 1; nextIndex < messages.length; nextIndex++) {
      const next = messages[nextIndex]
      if (next.role === "user") break
      if (next.role === "assistant") {
        assistantText = resolveTimelineMinimapPreviewText(messageText(next))
      }
    }

    items.push({
      id: message.id,
      userText: resolveTimelineMinimapPreviewText(messageText(message)),
      assistantText,
    })
  }

  return items
}

export function focusComposerInput() {
  document
    .querySelector<HTMLTextAreaElement>("[data-chat-composer-input]")
    ?.focus()
}

/**
 * Identity rather than ids. The stream processor rebuilds only the message it
 * touched, so comparing references costs the same as comparing ids but also
 * catches a change to a message that is not the tail — a tool result or an
 * approval lands on whichever message holds the matching call.
 */
export function isSameMessageList(left: UIMessage[], right: UIMessage[]) {
  return (
    left.length === right.length &&
    left.every((message, index) => message === right[index])
  )
}

/**
 * While the trailing assistant message streams, keep the preceding history at
 * the prior snapshot when the message identities are unchanged. Callers then
 * keep history rows out of the hot streaming render pass.
 */
export function resolveFrozenStreamingHistory(
  previous: UIMessage[],
  historySource: UIMessage[],
  isStreamingTail: boolean
): UIMessage[] {
  if (!isStreamingTail || !isSameMessageList(previous, historySource)) {
    return historySource
  }
  return previous
}

export function resolveMessageWebSearchSources({
  messageId,
  isStreamingMessage,
  persisted,
  turnSources,
  lastAssistantMessageId,
}: {
  messageId: string
  isStreamingMessage: boolean
  persisted: Record<string, WebSearchSource[]>
  turnSources: WebSearchSource[]
  lastAssistantMessageId: string | undefined
}): WebSearchSource[] | undefined {
  return resolveTurnOrPersistedList({
    messageId,
    isStreamingMessage,
    persisted,
    turnItems: turnSources,
    lastAssistantMessageId,
  })
}

export function resolveMessageWebSearchQueries({
  messageId,
  isStreamingMessage,
  persisted,
  turnQueries,
  lastAssistantMessageId,
}: {
  messageId: string
  isStreamingMessage: boolean
  persisted: Record<string, string[]>
  turnQueries: string[]
  lastAssistantMessageId: string | undefined
}): string[] | undefined {
  return resolveTurnOrPersistedList({
    messageId,
    isStreamingMessage,
    persisted,
    turnItems: turnQueries,
    lastAssistantMessageId,
  })
}

function resolveTurnOrPersistedList<T>({
  messageId,
  isStreamingMessage,
  persisted,
  turnItems,
  lastAssistantMessageId,
}: {
  messageId: string
  isStreamingMessage: boolean
  persisted: Record<string, T[]>
  turnItems: T[]
  lastAssistantMessageId: string | undefined
}): T[] | undefined {
  if (isStreamingMessage && turnItems.length > 0) return turnItems
  const stored = persisted[messageId]
  if (stored && stored.length > 0) return stored
  if (messageId === lastAssistantMessageId && turnItems.length > 0) {
    return turnItems
  }
  return undefined
}

export function splitThinkingAroundSearch(
  thinking: string,
  splitAt: number | undefined
) {
  if (
    splitAt === undefined ||
    !Number.isFinite(splitAt) ||
    splitAt < 0
  ) {
    return { before: thinking, after: "" }
  }
  const at = Math.min(Math.floor(splitAt), thinking.length)
  return {
    before: thinking.slice(0, at),
    after: thinking.slice(at),
  }
}

export function resolveMessageThinkingSearchSplitAt({
  messageId,
  isStreamingMessage,
  persisted,
  turnSplitAt,
  lastAssistantMessageId,
}: {
  messageId: string
  isStreamingMessage: boolean
  persisted: Record<string, number>
  turnSplitAt: number | undefined
  lastAssistantMessageId: string | undefined
}): number | undefined {
  if (isStreamingMessage && turnSplitAt !== undefined) return turnSplitAt
  const stored = persisted[messageId]
  if (stored !== undefined) return stored
  if (messageId === lastAssistantMessageId) return turnSplitAt
  return undefined
}

export function thinkingSearchSplitAtForPersist(
  persisted: Record<string, number>,
  lastAssistantMessageId: string | undefined,
  turnSplitAt: number | undefined
) {
  if (turnSplitAt === undefined || !lastAssistantMessageId) return persisted
  return { ...persisted, [lastAssistantMessageId]: turnSplitAt }
}

export function resolveAssistantMessageChrome({
  thinkingBefore,
  thinkingAfter,
  text,
  isStreaming,
  sourcesCount,
  queriesCount,
  isSearchingWeb,
}: {
  thinkingBefore: string
  thinkingAfter: string
  text: string
  isStreaming: boolean
  sourcesCount: number
  queriesCount: number
  isSearchingWeb: boolean
}) {
  const searchHasStarted = sourcesCount > 0 || queriesCount > 0
  const showReasoningBefore = thinkingBefore.trim().length > 0
  const showReasoningAfter = thinkingAfter.trim().length > 0
  const isStreamingThinkingBefore =
    showReasoningBefore && isStreaming && !text && !searchHasStarted
  const isStreamingThinkingAfter =
    showReasoningAfter && isStreaming && !text && searchHasStarted
  const showWebSearch =
    searchHasStarted ||
    (isSearchingWeb && !text && !isStreamingThinkingBefore)
  const isSearching =
    showWebSearch &&
    isSearchingWeb &&
    sourcesCount === 0 &&
    !text &&
    !showReasoningAfter
  return {
    showReasoningBefore,
    showReasoningAfter,
    isStreamingThinkingBefore,
    isStreamingThinkingAfter,
    showWebSearch,
    isSearching,
  }
}

export function webSearchToolCallCount(
  queriesCount: number,
  sourcesCount: number
) {
  if (queriesCount > 0) return queriesCount
  if (sourcesCount > 0) return 1
  return 0
}

export function webSearchToolCallLabel(count: number) {
  if (count === 1) return WEB_SEARCH_TOOL_CALL.singular
  return WEB_SEARCH_TOOL_CALL.plural(count)
}

export function findLastUserMessageId(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === "user") {
      return messages[index].id
    }
  }

  return null
}
