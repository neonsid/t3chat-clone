import type { Doc } from "../_generated/dataModel"

type StoredMessageText = Pick<Doc<"messages">, "content" | "thinking" | "parts">

export function getMessageContent(message: StoredMessageText) {
  if (message.content !== undefined) return message.content

  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("\n")
    .trim()
}

export function getMessageThinking(message: StoredMessageText) {
  if (message.thinking !== undefined) return message.thinking

  return (message.parts ?? [])
    .filter((part) => part.type === "thinking")
    .map((part) => part.content)
    .join("\n")
    .trim()
}
