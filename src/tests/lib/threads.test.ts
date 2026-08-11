import { describe, expect, it } from "vitest"

import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { createMessageProjectionCache, toChatMessages } from "@/lib/threads"

const storedMessageBase = {
  _id: "message-id" as Id<"messages">,
  _creationTime: 1,
  threadId: "thread-id" as Id<"threads">,
  messageId: "message-1",
  sequence: 0,
  role: "assistant" as const,
  status: "complete" as const,
  createdAt: 1,
}

describe("toChatMessages", () => {
  it("converts scalar text fields into UI message parts", () => {
    const messages = toChatMessages([
      {
        ...storedMessageBase,
        content: "Plain response",
        thinking: "Reasoning",
      } satisfies Doc<"messages">,
    ])

    expect(messages[0]?.parts).toEqual([
      { type: "thinking", content: "Reasoning" },
      { type: "text", content: "Plain response" },
    ])
  })

  it("continues to read legacy JSON parts during migration", () => {
    const messages = toChatMessages([
      {
        ...storedMessageBase,
        parts: [
          { type: "thinking", content: "Legacy reasoning" },
          { type: "text", content: "Legacy response" },
        ],
      } satisfies Doc<"messages">,
    ])

    expect(messages[0]?.parts).toEqual([
      { type: "thinking", content: "Legacy reasoning" },
      { type: "text", content: "Legacy response" },
    ])
  })
})

const generation = {
  modelId: "model-id",
  modelName: "Model",
  reasoningEffort: "medium" as const,
  outputTokens: 40,
  durationMs: 2000,
  timeToFirstTokenMs: 400,
}

function storedMessage(overrides: Partial<Doc<"messages">>): Doc<"messages"> {
  return { ...storedMessageBase, ...overrides }
}

describe("createMessageProjectionCache", () => {
  it("keeps message and collection identity when documents are unchanged", () => {
    const cache = createMessageProjectionCache()
    const documents = [storedMessage({ content: "First" })]

    const first = cache.messages(documents)
    const second = cache.messages([storedMessage({ content: "First" })])

    expect(second).toBe(first)
    expect(second[0]).toBe(first[0])
  })

  it("replaces only the message whose content changed", () => {
    const cache = createMessageProjectionCache()
    const first = cache.messages([
      storedMessage({ messageId: "message-1", content: "First" }),
      storedMessage({ messageId: "message-2", content: "Second" }),
    ])

    const second = cache.messages([
      storedMessage({ messageId: "message-1", content: "First" }),
      storedMessage({ messageId: "message-2", content: "Second edited" }),
    ])

    expect(second).not.toBe(first)
    expect(second[0]).toBe(first[0])
    expect(second[1]).not.toBe(first[1])
  })

  it("keeps finished generation stats identical when a later message arrives", () => {
    const cache = createMessageProjectionCache()
    const first = cache.generationStats([
      storedMessage({ messageId: "message-1", generation }),
    ])

    const second = cache.generationStats([
      storedMessage({ messageId: "message-1", generation }),
      storedMessage({ messageId: "message-2", generation }),
    ])

    expect(second["message-1"]).toBe(first["message-1"])
  })

  it("keeps the stats record identical when nothing changed", () => {
    const cache = createMessageProjectionCache()
    const documents = [storedMessage({ messageId: "message-1", generation })]

    expect(cache.generationStats(documents)).toBe(
      cache.generationStats([...documents])
    )
  })

  it("collects only the messages the user stopped", () => {
    const cache = createMessageProjectionCache()

    const stopped = cache.stoppedMessageIds([
      storedMessage({ messageId: "message-1" }),
      storedMessage({ messageId: "message-2", status: "stopped" }),
      storedMessage({ messageId: "message-3", status: "failed" }),
    ])

    expect([...stopped]).toEqual(["message-2"])
  })

  it("keeps the stopped set identical when nothing changed", () => {
    const cache = createMessageProjectionCache()
    const documents = [storedMessage({ status: "stopped" })]

    expect(cache.stoppedMessageIds(documents)).toBe(
      cache.stoppedMessageIds([...documents])
    )
  })

  it("rebuilds the stopped set when a message is stopped", () => {
    const cache = createMessageProjectionCache()
    const first = cache.stoppedMessageIds([storedMessage({})])

    const second = cache.stoppedMessageIds([
      storedMessage({ status: "stopped" }),
    ])

    expect(second).not.toBe(first)
    expect(second.has("message-1")).toBe(true)
  })
})
