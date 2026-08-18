import type { AssistantGenerationStats, ChatThread } from "@/lib/threads"

export const TEMP_THREAD_PREFIX = "tmp-"
export const TEMPORARY_SIDEBAR_TITLE = "New Chat"

/** Providers stream roughly a token per four characters of text + thinking. */
const EPHEMERAL_CHARS_PER_TOKEN = 4

export function estimateTemporaryGenerationStats({
  text,
  thinking,
  modelName,
  mode,
}: {
  text: string
  thinking: string
  modelName: string
  mode: string
}): AssistantGenerationStats {
  const chars = text.length + thinking.length
  return {
    modelName,
    mode,
    outputTokens: Math.max(1, Math.ceil(chars / EPHEMERAL_CHARS_PER_TOKEN)),
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
    pinnedAt: thread.pinnedAt,
    isTemporary: true,
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
  stoppedMessageIds: ReadonlySet<string>
): PersistableTemporaryMessage[] {
  const persistable: PersistableTemporaryMessage[] = []
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue
    const content = message.content.trim()
    const thinking = message.thinking.trim()
    const attachmentIds = attachmentIdsByMessageId[message.id]
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
    })
  }
  return persistable
}
