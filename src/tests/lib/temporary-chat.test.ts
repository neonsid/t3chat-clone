import { describe, expect, it } from "vitest"

import {
  createTemporarySidebarThread,
  createTemporaryThreadId,
  estimateTemporaryGenerationStats,
  isTemporaryThreadId,
  TEMP_THREAD_PREFIX,
  persistableMessagesToUiMessages,
  storedTemporaryThreadToChatThread,
  toPersistableTemporaryMessages,
} from "@/lib/temporary-chat"

describe("temporary thread ids", () => {
  it("recognizes the tmp- prefix", () => {
    expect(
      isTemporaryThreadId("tmp-1cd85bb5-be4e-4678-bb89-ddf64b067d3c")
    ).toBe(true)
    expect(isTemporaryThreadId("guest")).toBe(false)
    expect(isTemporaryThreadId("k57abc")).toBe(false)
  })

  it("mints ids that stay on the tmp- URL scheme", () => {
    const threadId = createTemporaryThreadId()
    expect(threadId.startsWith(TEMP_THREAD_PREFIX)).toBe(true)
    expect(isTemporaryThreadId(threadId)).toBe(true)
  })

  it("builds a local sidebar row with New Chat after the stream", () => {
    const idle = createTemporarySidebarThread("tmp-1", false, 1_700_000_000_000)
    expect(idle.isTemporary).toBe(true)
    expect(idle.isStreaming).toBe(false)
    expect(idle.title).toBe("New Chat")
    expect(idle.titleSource).toBe("derived")
    expect(idle.updatedAt).toBe(1_700_000_000_000)
  })

  it("marks the local sidebar row pending while streaming", () => {
    const streaming = createTemporarySidebarThread(
      "tmp-1",
      true,
      1_700_000_000_000
    )
    expect(streaming.isStreaming).toBe(true)
    expect(streaming.title).toBe("New Chat")
    expect(streaming.titleSource).toBe("pending")
  })

  it("estimates ephemeral generation stats from message length", () => {
    expect(
      estimateTemporaryGenerationStats({
        text: "abcd",
        thinking: "efgh",
        modelId: "openai/gpt-5.5",
        modelName: "GPT-5.5",
        mode: "Instant",
      })
    ).toEqual({
      modelId: "openai/gpt-5.5",
      modelName: "GPT-5.5",
      mode: "Instant",
      outputTokens: 2,
      tokensPerSecond: 0,
      timeToFirstTokenSeconds: 0,
    })
  })

  it("maps client messages into persistable convert payloads", () => {
    const persistable = toPersistableTemporaryMessages(
      [
        {
          id: "u1",
          role: "user",
          content: " Hello ",
          thinking: "",
          createdAt: 10,
        },
        {
          id: "a1",
          role: "assistant",
          content: "Hi",
          thinking: "reason",
          createdAt: 20,
        },
      ],
      { u1: ["att-1"] },
      new Set(["a1"])
    )

    expect(persistable).toEqual([
      {
        messageId: "u1",
        role: "user",
        content: "Hello",
        thinking: undefined,
        status: "complete",
        createdAt: 10,
        attachmentIds: ["att-1"],
      },
      {
        messageId: "a1",
        role: "assistant",
        content: "Hi",
        thinking: "reason",
        status: "stopped",
        createdAt: 20,
        attachmentIds: undefined,
      },
    ])
  })

  it("carries web search sources through persistable messages", () => {
    const persistable = toPersistableTemporaryMessages(
      [
        {
          id: "a1",
          role: "assistant",
          content: "Hi",
          thinking: "",
          createdAt: 20,
        },
      ],
      {},
      new Set(),
      {
        a1: [{ title: "Example", url: "https://example.com" }],
      }
    )

    expect(persistable[0]?.sources).toEqual([
      { title: "Example", url: "https://example.com" },
    ])
    expect(
      storedTemporaryThreadToChatThread(
        {
          id: "tmp-1",
          title: "New Chat",
          titleSource: "derived",
          createdAt: 10,
          updatedAt: 20,
          messages: persistable,
          generationStats: {},
          stoppedMessageIds: [],
        },
        false
      ).webSearchSources
    ).toEqual({
      a1: [{ title: "Example", url: "https://example.com" }],
    })
  })

  it("carries web search queries through persistable messages", () => {
    const persistable = toPersistableTemporaryMessages(
      [
        {
          id: "a1",
          role: "assistant",
          content: "Hi",
          thinking: "",
          createdAt: 20,
        },
      ],
      {},
      new Set(),
      {},
      {
        a1: ["agentic AI cybersecurity"],
      }
    )

    expect(persistable[0]?.searchQueries).toEqual(["agentic AI cybersecurity"])
    expect(
      storedTemporaryThreadToChatThread(
        {
          id: "tmp-1",
          title: "New Chat",
          titleSource: "derived",
          createdAt: 10,
          updatedAt: 20,
          messages: persistable,
          generationStats: {},
          stoppedMessageIds: [],
        },
        false
      ).webSearchQueries
    ).toEqual({
      a1: ["agentic AI cybersecurity"],
    })
  })

  it("carries the thinking search split through persistable messages", () => {
    const persistable = toPersistableTemporaryMessages(
      [
        {
          id: "a1",
          role: "assistant",
          content: "Hi",
          thinking: "plan eval",
          createdAt: 20,
        },
      ],
      {},
      new Set(),
      {},
      {},
      { a1: 5 }
    )

    expect(persistable[0]?.thinkingSearchSplitAt).toBe(5)
    expect(
      storedTemporaryThreadToChatThread(
        {
          id: "tmp-1",
          title: "New Chat",
          titleSource: "derived",
          createdAt: 10,
          updatedAt: 20,
          messages: persistable,
          generationStats: {},
          stoppedMessageIds: [],
        },
        false
      ).thinkingSearchSplitAt
    ).toEqual({ a1: 5 })
  })

  it("round-trips persistable messages into a sidebar thread", () => {
    const persistable = toPersistableTemporaryMessages(
      [
        {
          id: "u1",
          role: "user",
          content: "Hello",
          thinking: "",
          createdAt: 10,
        },
        {
          id: "a1",
          role: "assistant",
          content: "Hi",
          thinking: "",
          createdAt: 20,
        },
      ],
      {},
      new Set()
    )
    const thread = storedTemporaryThreadToChatThread(
      {
        id: "tmp-1",
        title: "Renamed",
        titleSource: "manual",
        createdAt: 10,
        updatedAt: 20,
        pinnedAt: 30,
        messages: persistable,
        generationStats: {
          a1: {
            modelName: "GPT-5.5",
            mode: "Instant",
            outputTokens: 2,
            tokensPerSecond: 0,
            timeToFirstTokenSeconds: 0,
          },
        },
        stoppedMessageIds: [],
        branchedFromThreadId: "tmp-source",
      },
      false
    )

    expect(thread.title).toBe("Renamed")
    expect(thread.pinnedAt).toBe(30)
    expect(thread.branchedFromThreadId).toBe("tmp-source")
    expect(thread.isTemporary).toBe(true)
    expect(persistableMessagesToUiMessages(persistable)).toEqual([
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", content: "Hello" }],
        createdAt: new Date(10),
      },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", content: "Hi" }],
        createdAt: new Date(20),
      },
    ])
  })
})
