import { chat } from "@tanstack/ai"
import { openRouterText } from "@tanstack/ai-openrouter"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"

export const streamOpenRouterChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
}) => {
  if (runtime.kind !== "openrouter") {
    throw new Error("Invalid OpenRouter runtime")
  }

  return chat({
    adapter: openRouterText(
      runtime.adapterModelId as Parameters<typeof openRouterText>[0]
    ),
    messages: [...messages],
    modelOptions: {
      maxCompletionTokens: MAX_MODEL_OUTPUT_TOKENS,
      ...(providerReasoningEffort
        ? { reasoning: { effort: providerReasoningEffort } }
        : {}),
      ...(runtime.variant ? { variant: runtime.variant } : {}),
    },
    abortController,
  })
}
