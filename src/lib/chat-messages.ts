import type { ModelMessage, UIMessage } from "@tanstack/ai"

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

export function latestUserChatMessage(messages: ChatRequestMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role !== "user") continue

    const id = "id" in message ? message.id : undefined
    if (typeof id !== "string") continue

    const content = chatMessageText(message)
    if (content) return { id, content }
  }

  return null
}
