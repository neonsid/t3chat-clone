import { describe, expect, it } from "vitest"

import {
  precedingUserMessageId,
  sliceMessagesThroughPrecedingUser,
  sliceUiMessagesThroughPrecedingUser,
  truncateTemporaryThreadForRetry,
} from "@/lib/thread-retry"
import type { PersistableTemporaryMessage, StoredTemporaryThread } from "@/lib/temporary-chat"

const messages: PersistableTemporaryMessage[] = [
  {
    messageId: "u1",
    role: "user",
    content: "Hi",
    status: "complete",
    createdAt: 1,
    attachmentIds: ["att-1"],
  },
  {
    messageId: "a1",
    role: "assistant",
    content: "Hello",
    status: "complete",
    createdAt: 2,
  },
  {
    messageId: "u2",
    role: "user",
    content: "More",
    status: "complete",
    createdAt: 3,
  },
  {
    messageId: "a2",
    role: "assistant",
    content: "Again",
    status: "complete",
    createdAt: 4,
  },
]

const source: StoredTemporaryThread = {
  id: "tmp-source",
  title: "Kept title",
  titleSource: "manual",
  createdAt: 1,
  updatedAt: 4,
  messages,
  generationStats: {
    a1: {
      modelName: "GPT-5.5",
      mode: "Instant",
      outputTokens: 4,
      tokensPerSecond: 1,
      timeToFirstTokenSeconds: 0.2,
    },
    a2: {
      modelName: "GPT-5.4 mini",
      mode: "Instant",
      outputTokens: 2,
      tokensPerSecond: 1,
      timeToFirstTokenSeconds: 0.1,
    },
  },
  stoppedMessageIds: ["a2"],
}

describe("precedingUserMessageId", () => {
  it("finds the user prompt that produced the assistant", () => {
    expect(precedingUserMessageId(messages, "a2")).toBe("u2")
    expect(precedingUserMessageId(messages, "a1")).toBe("u1")
  })

  it("returns null for a user message or a missing id", () => {
    expect(precedingUserMessageId(messages, "u2")).toBeNull()
    expect(precedingUserMessageId(messages, "missing")).toBeNull()
  })
})

describe("sliceMessagesThroughPrecedingUser", () => {
  it("keeps the preceding user and drops the assistant and later turns", () => {
    expect(
      sliceMessagesThroughPrecedingUser(messages, "a1")?.map(
        (message) => message.messageId
      )
    ).toEqual(["u1"])
    expect(
      sliceMessagesThroughPrecedingUser(messages, "a2")?.map(
        (message) => message.messageId
      )
    ).toEqual(["u1", "a1", "u2"])
  })
})

describe("sliceUiMessagesThroughPrecedingUser", () => {
  it("uses UI message ids", () => {
    const uiMessages = messages.map((message) => ({
      id: message.messageId,
      role: message.role,
    }))
    expect(
      sliceUiMessagesThroughPrecedingUser(uiMessages, "a1")?.map(
        (message) => message.id
      )
    ).toEqual(["u1"])
  })
})

describe("truncateTemporaryThreadForRetry", () => {
  it("drops the retried assistant and later messages", () => {
    const truncated = truncateTemporaryThreadForRetry({
      source,
      assistantMessageId: "a1",
      now: 99,
    })

    expect(truncated?.messages.map((message) => message.messageId)).toEqual([
      "u1",
    ])
    expect(truncated?.generationStats).toEqual({})
    expect(truncated?.stoppedMessageIds).toEqual([])
    expect(truncated?.updatedAt).toBe(99)
    expect(truncated?.title).toBe("Kept title")
    expect(source.messages).toHaveLength(4)
  })

  it("keeps earlier turns when retrying a later assistant", () => {
    const truncated = truncateTemporaryThreadForRetry({
      source,
      assistantMessageId: "a2",
    })

    expect(truncated?.messages.map((message) => message.messageId)).toEqual([
      "u1",
      "a1",
      "u2",
    ])
    expect(truncated?.generationStats["a1"]?.outputTokens).toBe(4)
    expect(truncated?.generationStats["a2"]).toBeUndefined()
    expect(truncated?.stoppedMessageIds).toEqual([])
  })
})
