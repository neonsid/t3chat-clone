import { describe, expect, it } from "vitest"

import {
  createTemporarySidebarThread,
  createTemporaryThreadId,
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

  it("builds a local sidebar row without a title", () => {
    const thread = createTemporarySidebarThread("tmp-1", true, 1_700_000_000_000)
    expect(thread.isTemporary).toBe(true)
    expect(thread.isStreaming).toBe(true)
    expect(thread.title).toBe("")
    expect(thread.updatedAt).toBe(1_700_000_000_000)
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
