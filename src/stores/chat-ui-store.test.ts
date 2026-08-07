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
})
