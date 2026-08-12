import type { ModelMessage, UIMessage } from "@tanstack/ai"

import { MAX_ATTACHMENTS_PER_MESSAGE } from "@/lib/attachment-limits"

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
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""

  let text = ""
  for (const part of content) {
    if (part.type === "text") text += part.content
  }
  return text.trim()
}

export function parseAttachmentIds(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error("Invalid attachments")
  }
  const ids = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0
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

    const id = "id" in message ? message.id : undefined
    if (typeof id !== "string") continue

    return { id, content: chatMessageText(message) }
  }

  return null
}
