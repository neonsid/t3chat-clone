import { chat } from "@tanstack/ai"
import type { ModelMessage } from "@tanstack/ai"
import { openRouterText } from "@tanstack/ai-openrouter"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"
import { enrichOpenRouterReasoningStream } from "@/lib/server/openrouter-reasoning"

type OpenRouterAdapter = ReturnType<typeof openRouterText>

function attachOpenRouterReasoningFixes(adapter: OpenRouterAdapter) {
  // Protected adapter methods — patched so OpenRouter's flat `delta.reasoning`
  // traces and prior ModelMessage.thinking round-trip correctly.
  const mutable = adapter as unknown as {
    processStreamChunks: (
      stream: AsyncIterable<unknown>,
      options: unknown,
      aguiState: unknown
    ) => AsyncIterable<unknown>
    convertMessage: (message: ModelMessage) => Record<string, unknown>
  }

  const processStreamChunks = mutable.processStreamChunks.bind(mutable)
  mutable.processStreamChunks = (stream, options, aguiState) =>
    processStreamChunks(
      enrichOpenRouterReasoningStream(
        stream as Parameters<typeof enrichOpenRouterReasoningStream>[0]
      ),
      options,
      aguiState
    )

  const convertMessage = mutable.convertMessage.bind(mutable)
  mutable.convertMessage = (message) => {
    const converted = convertMessage(message)
    if (message.role !== "assistant" || converted.role !== "assistant") {
      return converted
    }

    const thinking = (message.thinking ?? [])
      .map((part) => part.content.trim())
      .filter(Boolean)
      .join("\n")
    if (!thinking) return converted

    return {
      ...converted,
      reasoning: thinking,
      reasoningDetails: [{ type: "reasoning.text", text: thinking }],
    }
  }

  return adapter
}

export const streamOpenRouterChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
}) => {
  if (runtime.kind !== "openrouter") {
    throw new Error("Invalid OpenRouter runtime")
  }

  const adapter = attachOpenRouterReasoningFixes(
    openRouterText(
      runtime.adapterModelId as Parameters<typeof openRouterText>[0]
    )
  )

  return chat({
    adapter,
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
