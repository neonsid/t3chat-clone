import type { ChatThread } from "@/lib/threads"

export const TEMP_THREAD_PREFIX = "tmp-"

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
    title: "",
    titleSource: "derived",
    isStreaming,
    createdAt: now,
    updatedAt: now,
    messages: [],
    generationStats: {},
    isTemporary: true,
  }
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
