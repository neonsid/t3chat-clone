import { beforeEach, describe, expect, test, vi } from "vitest"

import {
  createChatUiStore,
  createThreadStateKey,
  getThreadComposerState,
} from "@/stores/chat-ui-store"
import { createMemoryStorage } from "@/stores/test-utils"

beforeEach(() => {
  vi.stubGlobal("sessionStorage", createMemoryStorage())
})

describe("chat UI store", () => {
  test("isolates thread state and clears only the submitted draft", () => {
    const store = createChatUiStore()
    const first = createThreadStateKey("user-1", "thread-1")
    const second = createThreadStateKey("user-1", "thread-2")

    store.getState().setDraft(first, "First draft")
    store.getState().setReasoningEffort(first, "high")
    store.getState().setSearchEnabled(first, true)
    store.getState().setDraft(second, "Second draft")
    store.getState().clearDraft(first)

    expect(getThreadComposerState(store.getState(), first)).toEqual({
      draft: "",
      reasoningEffort: "high",
      searchEnabled: true,
      attachments: [],
    })
    expect(getThreadComposerState(store.getState(), second).draft).toBe(
      "Second draft"
    )
  })

  test("moves pending state and removes the source entry", () => {
    const store = createChatUiStore()
    const pending = createThreadStateKey("user-1", "guest")
    const created = createThreadStateKey("user-1", "thread-1")

    store.getState().setDraft(pending, "Keep me")
    store.getState().moveThreadState(pending, created)

    expect(store.getState().composers[pending]).toBeUndefined()
    expect(getThreadComposerState(store.getState(), created).draft).toBe(
      "Keep me"
    )
  })

  test("rehydrates drafts from session storage", async () => {
    const firstStore = createChatUiStore()
    const key = createThreadStateKey(null, "guest")
    firstStore.getState().setDraft(key, "Persisted draft")

    const secondStore = createChatUiStore()
    await secondStore.persist.rehydrate()

    expect(getThreadComposerState(secondStore.getState(), key).draft).toBe(
      "Persisted draft"
    )
  })

  test("separate store factories do not share memory", () => {
    const firstStore = createChatUiStore()
    const secondStore = createChatUiStore()
    const key = createThreadStateKey("user-1", "thread-1")

    firstStore.getState().setDraft(key, "Only first")

    expect(getThreadComposerState(secondStore.getState(), key).draft).toBe("")
  })

  test("queues and peeks pending first-turn submissions", () => {
    const store = createChatUiStore()

    store.getState().queuePendingSubmission("thread-1", "  Hello  ")
    const pending = store.getState().peekPendingSubmission("thread-1")

    expect(pending).toMatchObject({ content: "Hello" })
    expect(pending?.messageId).toEqual(expect.any(String))
    expect(store.getState().peekPendingSubmission("thread-1")).toBe(pending)
  })

  test("takes a pending submission exactly once", () => {
    const store = createChatUiStore()
    store.getState().queuePendingSubmission("thread-1", "Hello")

    expect(store.getState().takePendingSubmission("thread-1")).toMatchObject({
      content: "Hello",
    })
    expect(store.getState().takePendingSubmission("thread-1")).toBeNull()
    expect(store.getState().peekPendingSubmission("thread-1")).toBeNull()
  })

  test("does not persist in-memory pending submissions", async () => {
    const firstStore = createChatUiStore()
    firstStore.getState().queuePendingSubmission("thread-1", "Hello")

    const secondStore = createChatUiStore()
    await secondStore.persist.rehydrate()

    expect(secondStore.getState().peekPendingSubmission("thread-1")).toBeNull()
  })

  test("queues attachment-only pending submissions", () => {
    const store = createChatUiStore()
    store.getState().queuePendingSubmission("thread-1", "", ["att-1"])
    expect(store.getState().peekPendingSubmission("thread-1")).toMatchObject({
      content: "",
      attachmentIds: ["att-1"],
    })
  })

  test("does not persist composer attachments", async () => {
    const firstStore = createChatUiStore()
    const key = createThreadStateKey("user-1", "thread-1")
    firstStore.getState().setAttachments(key, [
      {
        localId: "local-1",
        attachmentId: "att-1",
        filename: "photo.png",
        mimeType: "image/png",
        kind: "image",
        sizeBytes: 12,
        status: "ready",
        progress: 1,
      },
    ])

    const secondStore = createChatUiStore()
    await secondStore.persist.rehydrate()

    expect(
      getThreadComposerState(secondStore.getState(), key).attachments
    ).toEqual([])
  })

  test("marks hydration without persisting the hydration flag", async () => {
    const firstStore = createChatUiStore()
    firstStore.getState().markHydrated()

    const secondStore = createChatUiStore()
    await secondStore.persist.rehydrate()

    expect(firstStore.getState().isHydrated).toBe(true)
    expect(secondStore.getState().isHydrated).toBe(false)
  })
})
