import type { PersistableTemporaryMessage, StoredTemporaryThread } from "@/lib/temporary-chat"
import type { AssistantGenerationStats } from "@/lib/threads"

export function sliceMessagesThrough<T extends { messageId: string }>(
  messages: T[],
  messageId: string
): T[] | null {
  const index = messages.findIndex((message) => message.messageId === messageId)
  if (index < 0) return null
  return messages.slice(0, index + 1)
}

export function collectBranchAttachmentIds(
  messages: PersistableTemporaryMessage[]
) {
  const ids: string[] = []
  for (const message of messages) {
    for (const attachmentId of message.attachmentIds ?? []) {
      ids.push(attachmentId)
    }
  }
  return ids
}

export function remapKeyedRecord<T>(
  record: Record<string, T>,
  messageIdMap: Record<string, string>
) {
  const next: Record<string, T> = {}
  for (const [messageId, value] of Object.entries(record)) {
    const remapped = messageIdMap[messageId]
    if (!remapped) continue
    next[remapped] = value
  }
  return next
}

export function remapMessageIds(
  messageIds: string[],
  createId: () => string
) {
  const messageIdMap: Record<string, string> = {}
  for (const messageId of messageIds) {
    messageIdMap[messageId] = createId()
  }
  return messageIdMap
}

export function forkTemporaryThread({
  source,
  throughMessageId,
  newThreadId,
  attachmentIdMap,
  createId,
  now = Date.now(),
}: {
  source: StoredTemporaryThread
  throughMessageId: string
  newThreadId: string
  attachmentIdMap: Record<string, string>
  createId: () => string
  now?: number
}): StoredTemporaryThread | null {
  const sliced = sliceMessagesThrough(source.messages, throughMessageId)
  if (!sliced) return null

  const messageIdMap = remapMessageIds(
    sliced.map((message) => message.messageId),
    createId
  )

  const messages: PersistableTemporaryMessage[] = sliced.map((message) => {
    const messageId = messageIdMap[message.messageId]
    if (!messageId) {
      throw new Error("Missing remapped message id")
    }
    const attachmentIds = message.attachmentIds
      ?.map((attachmentId) => attachmentIdMap[attachmentId])
      .filter((attachmentId): attachmentId is string => Boolean(attachmentId))
    return {
      ...message,
      messageId,
      attachmentIds:
        attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
    }
  })

  const generationStats: Record<string, AssistantGenerationStats> =
    remapKeyedRecord(source.generationStats, messageIdMap)

  const stoppedMessageIds = source.stoppedMessageIds.flatMap((messageId) => {
    const remapped = messageIdMap[messageId]
    return remapped ? [remapped] : []
  })

  return {
    id: newThreadId,
    title: source.title,
    titleSource: source.titleSource === "pending" ? "derived" : source.titleSource,
    createdAt: now,
    updatedAt: now,
    messages,
    generationStats,
    stoppedMessageIds,
    branchedFromThreadId: source.id,
  }
}
