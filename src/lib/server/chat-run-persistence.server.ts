import type { StreamChunk } from "@tanstack/ai"
import type { ConvexHttpClient } from "convex/browser"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { MAX_MESSAGE_CONTENT_LENGTH } from "../../../convex/constants"
import type { ReasoningEffort } from "@/lib/chat-models"

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
}: {
  stream: AsyncIterable<StreamChunk>
  convex: ConvexHttpClient
  threadId: Id<"threads">
  runId: string
  completionSecret: string
  modelId: string
  modelName: string
  reasoningEffort: ReasoningEffort
  startedAt: number
  signal: AbortSignal
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

    const finishPayload = () => ({
      threadId,
      runId,
      completionSecret,
      assistantMessageId:
        assistantMessageId ??
        (thinking || text ? crypto.randomUUID() : undefined),
      content: text,
      thinking: thinking || undefined,
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
        } else if (chunk.type === "RUN_FINISHED") {
          outputTokens = chunk.usage?.completionTokens ?? 0
        } else if (chunk.type === "RUN_ERROR") {
          throw new Error(chunk.message || "Model generation failed")
        }
        yield chunk
      }

      // An abort usually ends the provider iterator rather than throwing, so
      // the loop falling through is not proof the answer is finished. Reading
      // the signal here is what keeps a stopped run from being filed as a
      // complete one, half a sentence and all.
      if (signal.aborted) {
        await convex.mutation(api.chatRuns.stop, finishPayload())
      } else {
        await convex.mutation(api.chatRuns.complete, finishPayload())
      }
      finished = true
    } catch (error) {
      if (signal.aborted) {
        await convex.mutation(api.chatRuns.stop, finishPayload())
      } else {
        await convex.mutation(api.chatRuns.fail, {
          ...finishPayload(),
          errorMessage:
            error instanceof Error ? error.message : "Generation failed",
        })
      }
      finished = true
      throw error
    } finally {
      // The client hanging up closes this generator mid-yield, which is the one
      // exit that reaches neither branch above.
      if (!finished) {
        await convex.mutation(api.chatRuns.stop, finishPayload())
      }
    }
  })()
}
