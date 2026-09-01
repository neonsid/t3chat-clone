import type { ModelMessage, StreamChunk } from "@tanstack/ai"

import type {
  ChatModelRuntime,
  ProviderReasoningEffort,
} from "@/lib/chat-models"

export type ChatExecutorOptions = {
  readonly runtime: ChatModelRuntime
  readonly messages: ReadonlyArray<ModelMessage>
  readonly providerReasoningEffort: ProviderReasoningEffort | undefined
  readonly abortController: AbortController
  readonly searchEnabled?: boolean
  readonly searchLimit?: number
  readonly promptCacheKey?: string
}

export type ChatExecutor = (
  options: ChatExecutorOptions
) => AsyncIterable<StreamChunk>
