import type { StreamChunk } from "@tanstack/ai"
import type { ConvexHttpClient } from "convex/browser"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { MAX_MESSAGE_CONTENT_LENGTH } from "../../../convex/constants"
import type { ReasoningEffort } from "@/lib/chat-models"
import type { JsonValue } from "@/lib/json-value"
import {
  parseWebSearchTurn,
  WEB_SEARCH_SOURCES_EVENT,
  type WebSearchSource,
} from "@/lib/web-search"

export type ChatRunConvexClient = Pick<ConvexHttpClient, "mutation">

const MAX_RUN_ERROR_MESSAGE_LENGTH = 500

export const CHAT_RUN_SAVE_FAILED =
  "Couldn't save this reply. Try sending again."

function persistErrorMessage(error: Error) {
  const message = error.message.trim() || "Generation failed"
  return message.slice(0, MAX_RUN_ERROR_MESSAGE_LENGTH)
}

function persistableThinkingSearchSplitAt(value: number | undefined) {
  if (value === undefined || !Number.isInteger(value) || value < 0) {
    return undefined
  }
  return value
}

function isFinishArgsRejected(error: Error) {
  const message = error.message
  return (
    message.includes("searchQueries") ||
    message.includes("ArgumentValidationError") ||
    message.includes("Validator:") ||
    /extra field/i.test(message)
  )
}

function clientFacingStreamError(error: Error) {
  if (isFinishArgsRejected(error)) return new Error(CHAT_RUN_SAVE_FAILED)
  return error
}

async function persistRunOutcome<
  T extends { searchQueries?: string[]; thinkingSearchSplitAt?: number },
>(
  convex: ChatRunConvexClient,
  reference: Parameters<ChatRunConvexClient["mutation"]>[0],
  payload: T
) {
  try {
    await convex.mutation(reference, payload)
  } catch (error) {
    const thrown =
      error instanceof Error ? error : new Error("Generation failed")
    if (!isFinishArgsRejected(thrown)) {
      throw thrown
    }
    const {
      searchQueries: _searchQueries,
      thinkingSearchSplitAt: _thinkingSearchSplitAt,
      ...rest
    } = payload
    await convex.mutation(reference, rest)
  }
}

function appendThinking(current: string, delta: string) {
  if (!delta) return current
  const remaining = MAX_MESSAGE_CONTENT_LENGTH - current.length
  if (remaining <= 0) return current
  return current + delta.slice(0, remaining)
}

/**
 * Passes the model's chunks straight through to the client while accumulating
 * the answer, then files the run's outcome once the stream ends.
 */
export function collectAndPersistStream({
  stream,
  convex,
  threadId,
  runId,
  completionSecret,
  modelId,
  modelName,
  reasoningEffort,
  startedAt,
  signal,
  persist = true,
}: {
  stream: AsyncIterable<StreamChunk>
  convex: ChatRunConvexClient
  threadId?: Id<"threads">
  runId?: string
  completionSecret?: string
  modelId: string
  modelName: string
  reasoningEffort: ReasoningEffort
  startedAt: number
  signal: AbortSignal
  persist?: boolean
}): AsyncIterable<StreamChunk> {
  return (async function* () {
    let assistantMessageId: string | undefined
    let text = ""
    let thinking = ""
    let hasSeenReasoningEvents = false
    let firstTokenAt: number | undefined
    let outputTokens = 0
    let streamedChunks = 0
    let finished = false
    let sources: WebSearchSource[] = []
    let searchQueries: string[] = []
    let thinkingSearchSplitAt: number | undefined

    const generation = () => ({
      modelId,
      modelName,
      reasoningEffort,
      // Usage only rides on RUN_FINISHED, which a stopped or failed run never
      // reaches. Providers stream roughly a token per chunk, so the chunk count
      // stands in for a count the UI then marks as approximate — better than
      // telling the reader a truncated answer cost zero tokens.
      outputTokens: outputTokens || streamedChunks,
      durationMs: Date.now() - startedAt,
      timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : 0,
    })

    const persistThreadId = threadId
    const persistRunId = runId
    const persistSecret = completionSecret
    const canPersist =
      persist &&
      persistThreadId !== undefined &&
      persistRunId !== undefined &&
      persistSecret !== undefined

    const finishPayload = () => ({
      threadId: persistThreadId!,
      runId: persistRunId!,
      completionSecret: persistSecret!,
      assistantMessageId:
        assistantMessageId ??
        (thinking || text ? crypto.randomUUID() : undefined),
      content: text,
      thinking: thinking || undefined,
      sources: sources.length > 0 ? sources : undefined,
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      thinkingSearchSplitAt:
        persistableThinkingSearchSplitAt(thinkingSearchSplitAt),
      generation: generation(),
    })

    try {
      for await (const chunk of stream) {
        if (chunk.type === "TEXT_MESSAGE_START") {
          assistantMessageId = chunk.messageId
        } else if (
          chunk.type === "REASONING_MESSAGE_START" ||
          chunk.type === "REASONING_START"
        ) {
          assistantMessageId ??= chunk.messageId
        } else if (chunk.type === "TEXT_MESSAGE_CONTENT") {
          firstTokenAt ??= Date.now()
          streamedChunks += 1
          text += chunk.delta
        } else if (chunk.type === "REASONING_MESSAGE_CONTENT") {
          firstTokenAt ??= Date.now()
          hasSeenReasoningEvents = true
          streamedChunks += 1
          thinking = appendThinking(thinking, chunk.delta)
          assistantMessageId ??= chunk.messageId
        } else if (chunk.type === "STEP_FINISHED") {
          // Adapters may emit STEP_FINISHED alongside REASONING_MESSAGE_CONTENT
          // with the same delta — prefer the AG-UI reasoning events when present.
          if (!hasSeenReasoningEvents && chunk.delta) {
            firstTokenAt ??= Date.now()
            streamedChunks += 1
            thinking = appendThinking(thinking, chunk.delta)
            assistantMessageId ??= crypto.randomUUID()
          }
        } else if (chunk.type === "CUSTOM") {
          if (chunk.name === WEB_SEARCH_SOURCES_EVENT) {
            // SAFETY: CUSTOM value is JSON we emitted as web-search.sources.
            const value: JsonValue = chunk.value as JsonValue
            const turn = parseWebSearchTurn(value)
            sources = turn.sources
            searchQueries = turn.queries
            if (
              thinkingSearchSplitAt === undefined &&
              (turn.sources.length > 0 || turn.queries.length > 0)
            ) {
              thinkingSearchSplitAt = thinking.length
            }
          }
        } else if (chunk.type === "RUN_FINISHED") {
          outputTokens = chunk.usage?.completionTokens ?? 0
          const cachedTokens = chunk.usage?.promptTokensDetails?.cachedTokens
          if (cachedTokens && cachedTokens > 0) {
            console.log("OpenAI prompt cache hit", {
              modelId,
              cachedTokens,
              promptTokens: chunk.usage?.promptTokens,
            })
          }
        } else if (chunk.type === "RUN_ERROR") {
          throw new Error(chunk.message || "Model generation failed")
        }
        yield chunk
      }

      // An abort usually ends the provider iterator rather than throwing, so
      // the loop falling through is not proof the answer is finished. Reading
      // the signal here is what keeps a stopped run from being filed as a
      // complete one, half a sentence and all.
      if (canPersist) {
        if (signal.aborted) {
          await persistRunOutcome(convex, api.chatRuns.stop, finishPayload())
        } else {
          await persistRunOutcome(convex, api.chatRuns.complete, finishPayload())
        }
      }
      finished = true
    } catch (error) {
      const thrown =
        error instanceof Error ? error : new Error("Generation failed")
      if (canPersist) {
        if (signal.aborted) {
          await persistRunOutcome(
            convex,
            api.chatRuns.stop,
            finishPayload()
          ).catch(() => undefined)
        } else {
          await persistRunOutcome(convex, api.chatRuns.fail, {
            ...finishPayload(),
            errorMessage: persistErrorMessage(thrown),
          }).catch(() => undefined)
        }
      }
      finished = true
      throw clientFacingStreamError(thrown)
    } finally {
      // The client hanging up closes this generator mid-yield, which is the one
      // exit that reaches neither branch above.
      if (!finished && canPersist) {
        await persistRunOutcome(
          convex,
          api.chatRuns.stop,
          finishPayload()
        ).catch(() => undefined)
      }
    }
  })()
}
