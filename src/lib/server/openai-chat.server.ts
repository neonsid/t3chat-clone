import { chat } from "@tanstack/ai"
import type { ContentPart, StreamChunk, TextOptions } from "@tanstack/ai"
import { OpenAITextAdapter, openaiText } from "@tanstack/ai-openai"
import { webSearchTool } from "@tanstack/ai-openai/tools"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { openaiInputFileFromDocumentPart } from "@/lib/server/openai-document-input"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"
import type { ProviderReasoningEffort } from "@/lib/chat-models"
import type { JsonValue } from "@/lib/json-value"
import {
  clampSearchLimit,
  mergeWebSearchQueries,
  mergeWebSearchSources,
  queriesFromOpenAIEvent,
  sourcesFromOpenAIEvent,
  WEB_SEARCH_SOURCES_EVENT,
  type WebSearchSource,
} from "@/lib/web-search"

type OpenAIChatModelId = Parameters<typeof openaiText>[0]
type OpenAIChatModelOptions = {
  max_output_tokens: number
  prompt_cache_key?: string
  prompt_cache_retention: "24h"
  reasoning?: {
    effort: ProviderReasoningEffort
    summary?: "auto"
  }
  max_tool_calls?: number
  include?: Array<"web_search_call.action.sources">
}

class OpenAITextAdapterWithDocuments extends OpenAITextAdapter<OpenAIChatModelId> {
  protected override convertContentPartToInput(part: ContentPart) {
    if (part.type === "document") {
      return openaiInputFileFromDocumentPart(part)
    }
    return super.convertContentPartToInput(part)
  }

  protected override async *processStreamChunks(
    stream: AsyncIterable<object>,
    toolCallMetadata: Map<
      string,
      {
        index: number
        name: string
        started: boolean
        ended?: boolean
        pendingArguments?: string | undefined
      }
    >,
    options: TextOptions,
    aguiState: {
      runId: string
      threadId: string
      messageId: string
      hasEmittedRunStarted: boolean
    }
  ): AsyncIterable<StreamChunk> {
    const collectedSources: WebSearchSource[] = []
    const collectedQueries: string[] = []
    async function* inspectStream() {
      for await (const event of stream) {
        // SAFETY: Responses stream events are JSON objects from the OpenAI SDK.
        const eventJson: JsonValue = event as JsonValue
        collectedSources.push(...sourcesFromOpenAIEvent(eventJson))
        collectedQueries.push(...queriesFromOpenAIEvent(eventJson))
        yield event
      }
    }

    let emittedSourceCount = 0
    let emittedQueryCount = 0
    function maybeSearchTurn() {
      const sources = mergeWebSearchSources(collectedSources)
      const queries = mergeWebSearchQueries(collectedQueries)
      if (
        sources.length === emittedSourceCount &&
        queries.length === emittedQueryCount
      ) {
        return null
      }
      emittedSourceCount = sources.length
      emittedQueryCount = queries.length
      return { sources, queries }
    }

    for await (const chunk of super.processStreamChunks(
      // SAFETY: inspectStream re-yields the original OpenAI Responses events.
      inspectStream() as never,
      toolCallMetadata,
      options,
      aguiState
    )) {
      const searchTurn = maybeSearchTurn()
      if (searchTurn) {
        yield {
          type: "CUSTOM",
          name: WEB_SEARCH_SOURCES_EVENT,
          value: searchTurn,
        }
      }
      yield chunk
    }
    const searchTurn = maybeSearchTurn()
    if (searchTurn) {
      yield {
        type: "CUSTOM",
        name: WEB_SEARCH_SOURCES_EVENT,
        value: searchTurn,
      }
    }
  }
}

export const streamOpenAIChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
  searchEnabled = false,
  searchLimit,
  promptCacheKey,
}) => {
  if (runtime.kind !== "openai") throw new Error("Invalid OpenAI runtime")

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
  const adapter = new OpenAITextAdapterWithDocuments(
    { apiKey },
    // SAFETY: adapterModelId is the OpenAI catalog id stored on ChatModelRuntime.
    runtime.adapterModelId as OpenAIChatModelId
  )

  const modelOptions: OpenAIChatModelOptions = {
    max_output_tokens: MAX_MODEL_OUTPUT_TOKENS,
    prompt_cache_retention: "24h",
  }
  if (promptCacheKey) {
    modelOptions.prompt_cache_key = promptCacheKey
  }
  if (providerReasoningEffort) {
    modelOptions.reasoning = { effort: providerReasoningEffort }
    if (providerReasoningEffort !== "none") {
      modelOptions.reasoning.summary = "auto"
    }
  }
  if (searchEnabled) {
    modelOptions.max_tool_calls = clampSearchLimit(searchLimit ?? 1)
    modelOptions.include = ["web_search_call.action.sources"]
    return chat({
      adapter,
      messages: [...messages],
      modelOptions,
      tools: [webSearchTool({ type: "web_search" })],
      abortController,
    })
  }

  return chat({
    adapter,
    messages: [...messages],
    modelOptions,
    abortController,
  })
}
