import type { ModelMessage } from "@tanstack/ai"

import { MAX_MODEL_CONTEXT_CHARACTERS } from "@/lib/chat-models"

export type ChatContextMessage = {
  role: "user" | "assistant"
  content: string
  thinking?: string
}

export function contextToModelMessages(
  messages: Array<ChatContextMessage>
): ModelMessage[] {
  const selected: ModelMessage[] = []
  let characterCount = 0

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const content = message.content.trim()
    const thinking = message.thinking?.trim() ?? ""
    if (!content && !thinking) continue

    const characterCost = content.length + thinking.length
    if (
      selected.length > 0 &&
      characterCount + characterCost > MAX_MODEL_CONTEXT_CHARACTERS
    ) {
      break
    }

    selected.push({
      role: message.role,
      content,
      ...(thinking ? { thinking: [{ content: thinking }] } : {}),
    })
    characterCount += characterCost
  }

  return selected.reverse()
}
