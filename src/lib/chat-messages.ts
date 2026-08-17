import type { ModelMessage, UIMessage } from "@tanstack/ai"

import { MAX_ATTACHMENTS_PER_MESSAGE } from "@/lib/attachment-limits"
import { isJsonString, type JsonValue } from "@/lib/json-value"

export type ChatRequestMessage = UIMessage | ModelMessage

export function chatMessageText(message: ChatRequestMessage): string {
  if ("parts" in message) {
    let text = ""
    for (const part of message.parts) {
      if (part.type === "text") text += part.content
    }
    return text.trim()
  }

  const content = message.content
  if (Array.isArray(content)) {
    let text = ""
    for (const part of content) {
      if (part.type === "text") text += part.content
    }
    return text.trim()
  }
  return content?.trim() ?? ""
}

export function parseAttachmentIds(value: JsonValue | undefined): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error("Invalid attachments")
  }
  const ids = value.filter(
    (entry): entry is string => isJsonString(entry) && entry.trim().length > 0
  )
  if (ids.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new Error("Too many attachments")
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate attachment ids")
  }
  return ids
}

/** Latest user turn with a stable id. Empty text is allowed when attachments are sent via forwardedProps. */
export function latestUserChatMessage(messages: ChatRequestMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (!message || message.role !== "user") continue

    if (!("id" in message) || message.id === undefined) continue
    const { id } = message

    return { id, content: chatMessageText(message) }
  }

  return null
}
