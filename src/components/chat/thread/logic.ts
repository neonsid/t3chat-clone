import type { UIMessage } from "@tanstack/ai-react"

import { resolveTimelineMinimapPreviewText } from "@/components/chat/timeline/logic"
import type { TimelineMinimapItem } from "@/components/chat/timeline/types"

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

export function findLastUserMessageId(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === "user") {
      return messages[index].id
    }
  }

  return null
}
