// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  sanitizePersistedTemporaryThreads,
  temporaryThreadsStore,
} from "@/stores/temporary-threads-store"

vi.hoisted(() => {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
  vi.stubGlobal("localStorage", storage)
})

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
          branchedFromThreadId: "tmp-source",
        },
      },
    })

    expect(sanitized.threads["tmp-1"]?.title).toBe("New Chat")
    expect(sanitized.threads["tmp-1"]?.messages).toHaveLength(1)
    expect(sanitized.threads["tmp-1"]?.stoppedMessageIds).toEqual(["a1"])
    expect(sanitized.threads["tmp-1"]?.branchedFromThreadId).toBe("tmp-source")
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
    temporaryThreadsStore
      .getState()
      .upsertLiveTranscript(threadId, transcriptSnapshot)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeDefined()

    temporaryThreadsStore.getState().removeThread(threadId)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeUndefined()

    temporaryThreadsStore
      .getState()
      .upsertLiveTranscript(threadId, transcriptSnapshot)
    expect(temporaryThreadsStore.getState().threads[threadId]).toBeUndefined()
  })

  it("inserts a forked thread without changing the source", () => {
    temporaryThreadsStore
      .getState()
      .upsertLiveTranscript("tmp-source", transcriptSnapshot)
    temporaryThreadsStore.getState().insertThread({
      id: "tmp-branch",
      title: "Kept title",
      titleSource: "derived",
      createdAt: 10,
      updatedAt: 10,
      messages: [
        {
          messageId: "u-new",
          role: "user",
          content: "Hi",
          status: "complete",
          createdAt: 1,
        },
      ],
      generationStats: {},
      stoppedMessageIds: [],
      branchedFromThreadId: "tmp-source",
    })

    const state = temporaryThreadsStore.getState()
    expect(state.threads["tmp-source"]?.messages[0]?.messageId).toBe("u1")
    expect(state.threads["tmp-branch"]?.messages[0]?.messageId).toBe("u-new")
    expect(state.threads["tmp-branch"]?.branchedFromThreadId).toBe("tmp-source")
  })

  it("keeps branch lineage when a live transcript updates", () => {
    temporaryThreadsStore.getState().insertThread({
      id: "tmp-branch",
      title: "Kept title",
      titleSource: "derived",
      createdAt: 10,
      updatedAt: 10,
      messages: transcriptSnapshot.messages,
      generationStats: {},
      stoppedMessageIds: [],
      branchedFromThreadId: "tmp-source",
    })

    temporaryThreadsStore.getState().upsertLiveTranscript("tmp-branch", {
      ...transcriptSnapshot,
      messages: [
        ...transcriptSnapshot.messages,
        {
          messageId: "a1",
          role: "assistant",
          content: "Hello",
          status: "complete",
          createdAt: 2,
        },
      ],
    })

    expect(
      temporaryThreadsStore.getState().threads["tmp-branch"]?.branchedFromThreadId
    ).toBe("tmp-source")
  })
})
