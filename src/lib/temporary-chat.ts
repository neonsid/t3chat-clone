import type { AssistantGenerationStats, ChatThread } from "@/lib/threads"
import { estimateTextTokens } from "@/lib/token-estimate"
import type { WebSearchSource } from "@/lib/web-search"

export const TEMP_THREAD_PREFIX = "tmp-"
export const TEMPORARY_SIDEBAR_TITLE = "New Chat"

export function estimateTemporaryGenerationStats({
  text,
  thinking,
  modelId,
  modelName,
  mode,
}: {
  text: string
  thinking: string
  modelId?: string
  modelName: string
  mode: string
}): AssistantGenerationStats {
  return {
    modelId,
    modelName,
    mode,
    outputTokens: Math.max(1, estimateTextTokens(text + thinking)),
    tokensPerSecond: 0,
    timeToFirstTokenSeconds: 0,
  }
}

export function isTemporaryThreadId(threadId: string) {
  return threadId.startsWith(TEMP_THREAD_PREFIX)
}

export function createTemporaryThreadId() {
  return `${TEMP_THREAD_PREFIX}${crypto.randomUUID()}`
}

export type PersistableTemporaryMessage = {
  messageId: string
  role: "user" | "assistant"
  content?: string
  thinking?: string
  status: "complete" | "stopped" | "failed"
  createdAt: number
  attachmentIds?: string[]
  sources?: WebSearchSource[]
  searchQueries?: string[]
  thinkingSearchSplitAt?: number
}

export function createTemporarySidebarThread(
  threadId: string,
  isStreaming: boolean,
  now = Date.now()
): ChatThread {
  return {
    id: threadId,
    title: TEMPORARY_SIDEBAR_TITLE,
    titleSource: isStreaming ? "pending" : "derived",
    isStreaming,
    createdAt: now,
    updatedAt: now,
    messages: [],
    generationStats: {},
    webSearchSources: {},
    webSearchQueries: {},
    thinkingSearchSplitAt: {},
    isTemporary: true,
  }
}

export type StoredTemporaryThread = {
  id: string
  title: string
  titleSource: ChatThread["titleSource"]
  createdAt: number
  updatedAt: number
  pinnedAt?: number
  archivedAt?: number
  messages: PersistableTemporaryMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  stoppedMessageIds: string[]
  branchedFromThreadId?: string
}

export function webSearchSourcesFromPersistable(
  messages: PersistableTemporaryMessage[]
) {
  const sources: Record<string, WebSearchSource[]> = {}
  for (const message of messages) {
    if (!message.sources || message.sources.length === 0) continue
    sources[message.messageId] = message.sources
  }
  return sources
}

export function webSearchQueriesFromPersistable(
  messages: PersistableTemporaryMessage[]
) {
  const queries: Record<string, string[]> = {}
  for (const message of messages) {
    if (!message.searchQueries || message.searchQueries.length === 0) continue
    queries[message.messageId] = message.searchQueries
  }
  return queries
}

export function thinkingSearchSplitAtFromPersistable(
  messages: PersistableTemporaryMessage[]
) {
  const splitAt: Record<string, number> = {}
  for (const message of messages) {
    if (
      message.thinkingSearchSplitAt === undefined ||
      !Number.isInteger(message.thinkingSearchSplitAt) ||
      message.thinkingSearchSplitAt < 0
    ) {
      continue
    }
    splitAt[message.messageId] = message.thinkingSearchSplitAt
  }
  return splitAt
}

export function persistableMessagesToUiMessages(
  messages: PersistableTemporaryMessage[]
) {
  return messages.map((message) => ({
    id: message.messageId,
    role: message.role,
    parts: [
      ...(message.thinking
        ? [{ type: "thinking" as const, content: message.thinking }]
        : []),
      ...(message.content
        ? [{ type: "text" as const, content: message.content }]
        : []),
    ],
    createdAt: new Date(message.createdAt),
  }))
}

export function storedTemporaryThreadToChatThread(
  thread: StoredTemporaryThread,
  isStreaming: boolean
): ChatThread {
  return {
    id: thread.id,
    title: thread.title,
    titleSource: isStreaming ? "pending" : thread.titleSource,
    isStreaming,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messages: persistableMessagesToUiMessages(thread.messages),
    generationStats: thread.generationStats,
    webSearchSources: webSearchSourcesFromPersistable(thread.messages),
    webSearchQueries: webSearchQueriesFromPersistable(thread.messages),
    thinkingSearchSplitAt: thinkingSearchSplitAtFromPersistable(thread.messages),
    pinnedAt: thread.pinnedAt,
    isTemporary: true,
    branchedFromThreadId: thread.branchedFromThreadId,
  }
}

export function storedTemporaryThreadsEqual(
  left: StoredTemporaryThread,
  right: StoredTemporaryThread
) {
  return (
    JSON.stringify({ ...left, updatedAt: 0 }) ===
    JSON.stringify({ ...right, updatedAt: 0 })
  )
}

export function toPersistableTemporaryMessages(
  messages: Array<{
    id: string
    role: string
    content: string
    thinking: string
    createdAt: number
  }>,
  attachmentIdsByMessageId: { [messageId: string]: string[] },
  stoppedMessageIds: ReadonlySet<string>,
  sourcesByMessageId: Record<string, WebSearchSource[]> = {},
  queriesByMessageId: Record<string, string[]> = {},
  thinkingSearchSplitAtByMessageId: Record<string, number> = {}
): PersistableTemporaryMessage[] {
  const persistable: PersistableTemporaryMessage[] = []
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue
    const content = message.content.trim()
    const thinking = message.thinking.trim()
    const attachmentIds = attachmentIdsByMessageId[message.id]
    const sources = sourcesByMessageId[message.id]
    const searchQueries = queriesByMessageId[message.id]
    const thinkingSearchSplitAt = thinkingSearchSplitAtByMessageId[message.id]
    if (
      !content &&
      !thinking &&
      (!attachmentIds || attachmentIds.length === 0)
    ) {
      continue
    }
    persistable.push({
      messageId: message.id,
      role: message.role,
      content: content || undefined,
      thinking: thinking || undefined,
      status: stoppedMessageIds.has(message.id) ? "stopped" : "complete",
      createdAt: message.createdAt,
      attachmentIds:
        attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
      sources: sources && sources.length > 0 ? sources : undefined,
      searchQueries:
        searchQueries && searchQueries.length > 0 ? searchQueries : undefined,
      thinkingSearchSplitAt,
    })
  }
  return persistable
}
