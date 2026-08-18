import { afterEach, describe, expect, it } from "vitest"

import {
  sanitizePersistedTemporaryThreads,
  temporaryThreadsStore,
} from "@/stores/temporary-threads-store"

const transcriptSnapshot = {
  messages: [
    {
      messageId: "u1",
      role: "user" as const,
      content: "Hi",
      status: "complete" as const,
      createdAt: 1,
    },
  ],
  generationStats: {},
  stoppedMessageIds: [],
}

afterEach(() => {
  temporaryThreadsStore.setState({
    threads: {},
    forgottenThreadIds: {},
  })
})

describe("sanitizePersistedTemporaryThreads", () => {
  it("keeps a well-formed local thread", () => {
    const sanitized = sanitizePersistedTemporaryThreads({
      threads: {
        "tmp-1": {
          id: "tmp-1",
          title: "New Chat",
          titleSource: "derived",
          createdAt: 1,
          updatedAt: 2,
          messages: [
            {
              messageId: "u1",
              role: "user",
              content: "Hi",
              status: "complete",
              createdAt: 1,
            },
          ],
          generationStats: {
            a1: {
              modelName: "GPT-5.5",
              mode: "Instant",
              outputTokens: 2,
              tokensPerSecond: 0,
              timeToFirstTokenSeconds: 0,
            },
          },
          stoppedMessageIds: ["a1"],
        },
      },
    })

    expect(sanitized.threads["tmp-1"]?.title).toBe("New Chat")
    expect(sanitized.threads["tmp-1"]?.messages).toHaveLength(1)
    expect(sanitized.threads["tmp-1"]?.stoppedMessageIds).toEqual(["a1"])
  })

  it("drops malformed threads and pending titles", () => {
    const sanitized = sanitizePersistedTemporaryThreads({
      threads: {
        "tmp-bad": { id: "other", title: "Nope" },
        "tmp-ok": {
          id: "tmp-ok",
          title: "Kept",
          titleSource: "pending",
          createdAt: 1,
          updatedAt: 2,
          messages: [],
          generationStats: {},
          stoppedMessageIds: [],
        },
      },
    })

    expect(sanitized.threads["tmp-bad"]).toBeUndefined()
    expect(sanitized.threads["tmp-ok"]?.titleSource).toBe("derived")
  })
})

describe("temporaryThreadsStore", () => {
  it("does not recreate a thread after it is removed", () => {
    const threadId = "tmp-converted"
    temporaryThreadsStore.getState().upsertLiveTranscript(threadId, transcriptSnapshot)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeDefined()

    temporaryThreadsStore.getState().removeThread(threadId)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeUndefined()

    temporaryThreadsStore.getState().upsertLiveTranscript(threadId, transcriptSnapshot)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeUndefined()
  })
})
