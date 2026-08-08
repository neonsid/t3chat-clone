import { chat } from "@tanstack/ai"
import { openaiText } from "@tanstack/ai-openai"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"

export const streamOpenAIChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
}) => {
  if (runtime.kind !== "openai") throw new Error("Invalid OpenAI runtime")

  return chat({
    adapter: openaiText(
      runtime.adapterModelId as Parameters<typeof openaiText>[0]
    ),
    messages: [...messages],
    modelOptions: {
      max_output_tokens: MAX_MODEL_OUTPUT_TOKENS,
      ...(providerReasoningEffort
        ? { reasoning: { effort: providerReasoningEffort } }
        : {}),
    },
    abortController,
  })
}
