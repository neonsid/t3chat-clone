import { describe, expect, it, vi } from "vitest"
import type { StreamChunk } from "@tanstack/ai"
import { getFunctionName } from "convex/server"

import { asThreadId } from "@/lib/convex-ids"
import {
  collectAndPersistStream,
  type ChatRunConvexClient,
} from "@/lib/server/chat-run-persistence.server"
import { WEB_SEARCH_SOURCES_EVENT } from "@/lib/web-search"

type FinishCall = {
  name: string
  content: string
  outputTokens: number
}

type FinishPayload = {
  content: string
  generation: { outputTokens: number }
  sources?: Array<{ title: string; url: string }>
  searchQueries?: string[]
  thinking?: string
  thinkingSearchSplitAt?: number
}

type FunctionReference = Parameters<typeof getFunctionName>[0]

// Chunk types are an AG-UI string enum that @tanstack/ai does not re-export,
// so literals need the cast even though the values match.
function asStreamChunk(value: {
  type: string
  messageId?: string
  role?: string
  delta?: string
  threadId?: string
  runId?: string
  name?: string
  value?: unknown
  usage?: {
    completionTokens: number
    promptTokensDetails?: { cachedTokens?: number }
  }
}): StreamChunk {
  // SAFETY: AG-UI chunk type is a string enum @tanstack/ai does not re-export.
  return value as StreamChunk
}

function textChunks(...deltas: string[]): StreamChunk[] {
  return [
    asStreamChunk({
      type: "TEXT_MESSAGE_START",
      messageId: "assistant-1",
      role: "assistant",
    }),
    ...deltas.map((delta) =>
      asStreamChunk({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "assistant-1",
        delta,
      })
    ),
  ]
}

/**
 * Function references are fresh proxies on every property access, so the call
 * is identified by name rather than identity.
 */
function collect(
  chunks: StreamChunk[],
  signal: AbortSignal,
  onChunkConsumed?: (index: number) => void
) {
  const mutation =
    vi.fn<
      (reference: FunctionReference, payload: FinishPayload) => Promise<void>
    >()
  // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
  const convex: ChatRunConvexClient = {
    mutation: mutation as ChatRunConvexClient["mutation"],
  }

  const source = (async function* () {
    for (const [index, chunk] of chunks.entries()) {
      yield chunk
      onChunkConsumed?.(index)
    }
  })()

  const stream = collectAndPersistStream({
    stream: source,
    convex,
    threadId: asThreadId("thread-1"),
    runId: "run-1",
    completionSecret: "secret",
    modelId: "openai/gpt-5.6-luna",
    modelName: "GPT-5.6 Luna",
    reasoningEffort: "instant",
    startedAt: Date.now(),
    signal,
  })

  const finishCalls = (): FinishCall[] =>
    mutation.mock.calls.map(([reference, payload]) => ({
      name: getFunctionName(reference),
      content: payload.content,
      outputTokens: payload.generation.outputTokens,
    }))

  return { stream, finishCalls }
}

async function drain(stream: AsyncIterable<StreamChunk>) {
  for await (const chunk of stream) void chunk
}

describe("collectAndPersistStream", () => {
  it("files a finished answer as complete", async () => {
    const { stream, finishCalls } = collect(
      textChunks("Hello ", "world"),
      new AbortController().signal
    )

    await drain(stream)

    expect(finishCalls()).toEqual([
      { name: "chatRuns:complete", content: "Hello world", outputTokens: 2 },
    ])
  })

  it("does not persist when persist is false", async () => {
    const mutation =
      vi.fn<
        (reference: FunctionReference, payload: FinishPayload) => Promise<void>
      >()
    // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
    const convex: ChatRunConvexClient = {
      mutation: mutation as ChatRunConvexClient["mutation"],
    }
    const source = (async function* () {
      for (const chunk of textChunks("Hello")) yield chunk
    })()
    const stream = collectAndPersistStream({
      stream: source,
      convex,
      modelId: "openai/gpt-5.6-luna",
      modelName: "GPT-5.6 Luna",
      reasoningEffort: "instant",
      startedAt: Date.now(),
      signal: new AbortController().signal,
      persist: false,
    })

    await drain(stream)

    expect(mutation).not.toHaveBeenCalled()
  })

  // The bug this guards: aborting ends the provider iterator instead of
  // throwing, so the loop finished normally and a half-written answer was
  // filed as a complete one — leaving the reader no sign it had been stopped.
  it("files a stopped answer as stopped when the iterator just ends", async () => {
    const controller = new AbortController()
    const { stream, finishCalls } = collect(
      textChunks("Hello ", "wor"),
      controller.signal,
      (index) => {
        if (index === 2) controller.abort()
      }
    )

    await drain(stream)

    expect(finishCalls()).toEqual([
      { name: "chatRuns:stop", content: "Hello wor", outputTokens: 2 },
    ])
  })

  it("files a stopped answer when the consumer hangs up mid-stream", async () => {
    const { stream, finishCalls } = collect(
      textChunks("Hello ", "world"),
      new AbortController().signal
    )

    for await (const chunk of stream) {
      if (chunk.type === "TEXT_MESSAGE_CONTENT") break
    }

    expect(finishCalls()).toEqual([
      { name: "chatRuns:stop", content: "Hello ", outputTokens: 1 },
    ])
  })

  it("prefers the provider's usage over the chunk estimate", async () => {
    const { stream, finishCalls } = collect(
      [
        ...textChunks("a", "b"),
        asStreamChunk({
          type: "RUN_FINISHED",
          threadId: "thread-1",
          runId: "run-1",
          usage: { completionTokens: 42 },
        }),
      ],
      new AbortController().signal
    )

    await drain(stream)

    expect(finishCalls()).toEqual([
      { name: "chatRuns:complete", content: "ab", outputTokens: 42 },
    ])
  })

  it("files CUSTOM web-search sources on complete", async () => {
    const mutation =
      vi.fn<
        (reference: FunctionReference, payload: FinishPayload) => Promise<void>
      >()
    // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
    const convex: ChatRunConvexClient = {
      mutation: mutation as ChatRunConvexClient["mutation"],
    }
    const source = (async function* () {
      yield asStreamChunk({
        type: "CUSTOM",
        name: WEB_SEARCH_SOURCES_EVENT,
        value: [
          { title: "Example", url: "https://example.com/page" },
          { title: "Dup", url: "https://example.com/page" },
        ],
      })
      for (const chunk of textChunks("Hello")) yield chunk
    })()
    const stream = collectAndPersistStream({
      stream: source,
      convex,
      threadId: asThreadId("thread-1"),
      runId: "run-1",
      completionSecret: "secret",
      modelId: "openai/gpt-5.6-luna",
      modelName: "GPT-5.6 Luna",
      reasoningEffort: "instant",
      startedAt: Date.now(),
      signal: new AbortController().signal,
    })

    await drain(stream)

    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      content: "Hello",
      sources: [{ title: "Example", url: "https://example.com/page" }],
    })
    const finishReference = mutation.mock.calls[0]?.[0]
    expect(finishReference).toBeDefined()
    expect(finishReference && getFunctionName(finishReference)).toBe(
      "chatRuns:complete"
    )
  })

  it("files CUSTOM web-search queries from a turn payload", async () => {
    const mutation =
      vi.fn<
        (reference: FunctionReference, payload: FinishPayload) => Promise<void>
      >()
    // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
    const convex: ChatRunConvexClient = {
      mutation: mutation as ChatRunConvexClient["mutation"],
    }
    const source = (async function* () {
      yield asStreamChunk({
        type: "CUSTOM",
        name: WEB_SEARCH_SOURCES_EVENT,
        value: {
          sources: [{ title: "Example", url: "https://example.com/page" }],
          queries: ["agentic AI cybersecurity"],
        },
      })
      for (const chunk of textChunks("Hello")) yield chunk
    })()
    const stream = collectAndPersistStream({
      stream: source,
      convex,
      threadId: asThreadId("thread-1"),
      runId: "run-1",
      completionSecret: "secret",
      modelId: "openai/gpt-5.6-luna",
      modelName: "GPT-5.6 Luna",
      reasoningEffort: "instant",
      startedAt: Date.now(),
      signal: new AbortController().signal,
    })

    await drain(stream)

    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      content: "Hello",
      sources: [{ title: "Example", url: "https://example.com/page" }],
      searchQueries: ["agentic AI cybersecurity"],
    })
  })

  it("retries complete without searchQueries when Convex rejects the extra field", async () => {
    const mutation =
      vi.fn<
        (reference: FunctionReference, payload: FinishPayload) => Promise<void>
      >()
    mutation.mockRejectedValueOnce(
      new Error(
        "ArgumentValidationError: Object contains extra field `searchQueries`"
      )
    )
    mutation.mockResolvedValueOnce(undefined)
    // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
    const convex: ChatRunConvexClient = {
      mutation: mutation as ChatRunConvexClient["mutation"],
    }
    const source = (async function* () {
      yield asStreamChunk({
        type: "CUSTOM",
        name: WEB_SEARCH_SOURCES_EVENT,
        value: {
          sources: [{ title: "Example", url: "https://example.com/page" }],
          queries: ["agentic AI"],
        },
      })
      for (const chunk of textChunks("Hello")) yield chunk
    })()
    const stream = collectAndPersistStream({
      stream: source,
      convex,
      threadId: asThreadId("thread-1"),
      runId: "run-1",
      completionSecret: "secret",
      modelId: "openai/gpt-5.6-luna",
      modelName: "GPT-5.6 Luna",
      reasoningEffort: "instant",
      startedAt: Date.now(),
      signal: new AbortController().signal,
    })

    await drain(stream)

    expect(mutation).toHaveBeenCalledTimes(2)
    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      content: "Hello",
      searchQueries: ["agentic AI"],
    })
    expect(mutation.mock.calls[1]?.[1]).toMatchObject({ content: "Hello" })
    expect(mutation.mock.calls[1]?.[1]).not.toHaveProperty("searchQueries")
  })

  it("records the thinking split at the first web search turn", async () => {
    const mutation =
      vi.fn<
        (reference: FunctionReference, payload: FinishPayload) => Promise<void>
      >()
    // SAFETY: persistence tests only exercise mutation(); the mock is not a ConvexHttpClient.
    const convex: ChatRunConvexClient = {
      mutation: mutation as ChatRunConvexClient["mutation"],
    }
    const source = (async function* () {
      yield asStreamChunk({
        type: "REASONING_MESSAGE_CONTENT",
        messageId: "assistant-1",
        delta: "plan ",
      })
      yield asStreamChunk({
        type: "CUSTOM",
        name: WEB_SEARCH_SOURCES_EVENT,
        value: {
          sources: [{ title: "Example", url: "https://example.com/page" }],
          queries: ["latest articles"],
        },
      })
      yield asStreamChunk({
        type: "REASONING_MESSAGE_CONTENT",
        messageId: "assistant-1",
        delta: "eval",
      })
      for (const chunk of textChunks("Hello")) yield chunk
    })()
    const stream = collectAndPersistStream({
      stream: source,
      convex,
      threadId: asThreadId("thread-1"),
      runId: "run-1",
      completionSecret: "secret",
      modelId: "openai/gpt-5.6-luna",
      modelName: "GPT-5.6 Luna",
      reasoningEffort: "low",
      startedAt: Date.now(),
      signal: new AbortController().signal,
    })

    await drain(stream)

    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      content: "Hello",
      thinking: "plan eval",
      thinkingSearchSplitAt: 5,
    })
  })
})
