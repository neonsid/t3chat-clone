import { describe, expect, it } from "vitest"

import {
  createTemporarySidebarThread,
  createTemporaryThreadId,
  estimateTemporaryGenerationStats,
  isTemporaryThreadId,
  TEMP_THREAD_PREFIX,
  toPersistableTemporaryMessages,
} from "@/lib/temporary-chat"

describe("temporary thread ids", () => {
  it("recognizes the tmp- prefix", () => {
    expect(isTemporaryThreadId("tmp-1cd85bb5-be4e-4678-bb89-ddf64b067d3c")).toBe(
      true
    )
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
        modelName: "GPT-5.5",
        mode: "Instant",
      })
    ).toEqual({
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
})
