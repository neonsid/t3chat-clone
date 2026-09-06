import type { StoredTemporaryThread } from "@/lib/temporary-chat"

export function precedingUserMessageId<
  T extends { messageId: string; role: string },
>(messages: T[], assistantMessageId: string): string | null {
  const assistantIndex = messages.findIndex(
    (message) => message.messageId === assistantMessageId
  )
  if (assistantIndex < 0) return null
  if (messages[assistantIndex]?.role !== "assistant") return null

  for (let index = assistantIndex - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.role === "user") return message.messageId
  }
  return null
}

export function sliceMessagesThroughPrecedingUser<
  T extends { messageId: string; role: string },
>(messages: T[], assistantMessageId: string): T[] | null {
  const userMessageId = precedingUserMessageId(messages, assistantMessageId)
  if (!userMessageId) return null
  const userIndex = messages.findIndex(
    (message) => message.messageId === userMessageId
  )
  if (userIndex < 0) return null
  return messages.slice(0, userIndex + 1)
}

export function sliceUiMessagesThroughPrecedingUser<
  T extends { id: string; role: string },
>(messages: T[], assistantMessageId: string): T[] | null {
  return (
    sliceMessagesThroughPrecedingUser(
      messages.map((message) => ({
        messageId: message.id,
        role: message.role,
        message,
      })),
      assistantMessageId
    )?.map((entry) => entry.message) ?? null
  )
}

export function truncateTemporaryThreadForRetry({
  source,
  assistantMessageId,
  now = Date.now(),
}: {
  source: StoredTemporaryThread
  assistantMessageId: string
  now?: number
}): StoredTemporaryThread | null {
  const kept = sliceMessagesThroughPrecedingUser(
    source.messages,
    assistantMessageId
  )
  if (!kept) return null

  const keptIds = new Set(kept.map((message) => message.messageId))
  const generationStats: StoredTemporaryThread["generationStats"] = {}
  for (const [messageId, stats] of Object.entries(source.generationStats)) {
    if (!keptIds.has(messageId)) continue
    generationStats[messageId] = stats
  }

  return {
    ...source,
    updatedAt: now,
    messages: kept,
    generationStats,
    stoppedMessageIds: source.stoppedMessageIds.filter((messageId) =>
      keptIds.has(messageId)
    ),
  }
}
