import { chat } from "@tanstack/ai"
import type { ModelMessage } from "@tanstack/ai"
import { openRouterText } from "@tanstack/ai-openrouter"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"
import type { ProviderReasoningEffort } from "@/lib/chat-models"
import { enrichOpenRouterReasoningStream } from "@/lib/server/openrouter-reasoning"
import type { OpenRouterStreamChunk } from "@/lib/server/openrouter-reasoning"

type OpenRouterAdapter = ReturnType<typeof openRouterText>
type OpenRouterChatModelId = Parameters<typeof openRouterText>[0]

type OpenRouterConvertedMessage = {
  role?: string
  reasoning?: string
  reasoningDetails?: Array<{ type: string; text: string }>
}

type OpenRouterChatModelOptions = {
  maxCompletionTokens: number
  reasoning?: { effort: ProviderReasoningEffort }
  variant?: "nitro"
}

type OpenRouterForwardedState = {
  readonly requestId?: string
}

type OpenRouterAdapterInternals = {
  processStreamChunks: (
    stream: AsyncIterable<OpenRouterStreamChunk>,
    options: OpenRouterForwardedState,
    aguiState: OpenRouterForwardedState
  ) => AsyncIterable<OpenRouterStreamChunk>
  convertMessage: (message: ModelMessage) => OpenRouterConvertedMessage
}

function attachOpenRouterReasoningFixes(adapter: OpenRouterAdapter) {
  // Protected adapter methods — patched so OpenRouter's flat `delta.reasoning`
  // traces and prior ModelMessage.thinking round-trip correctly.
  // SAFETY: processStreamChunks and convertMessage are protected adapter hooks.
  // @ts-expect-error protected adapter internals
  const mutable: OpenRouterAdapterInternals = adapter

  const processStreamChunks = mutable.processStreamChunks.bind(mutable)
  mutable.processStreamChunks = (stream, options, aguiState) =>
    processStreamChunks(
      enrichOpenRouterReasoningStream(stream),
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
      // SAFETY: adapterModelId is the OpenRouter catalog id stored on ChatModelRuntime.
      runtime.adapterModelId as OpenRouterChatModelId
    )
  )

  const modelOptions: OpenRouterChatModelOptions = {
    maxCompletionTokens: MAX_MODEL_OUTPUT_TOKENS,
  }
  if (providerReasoningEffort) {
    modelOptions.reasoning = { effort: providerReasoningEffort }
  }
  if (runtime.variant) {
    modelOptions.variant = runtime.variant
  }

  return chat({
    adapter,
    messages: [...messages],
    modelOptions,
    abortController,
  })
}
