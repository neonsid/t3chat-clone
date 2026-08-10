import { afterEach, describe, expect, test, vi } from "vitest"

import { chatRuntimeStore } from "@/stores/chat-runtime-store"

afterEach(() => {
  chatRuntimeStore.getState().setActiveTurn(false)
  chatRuntimeStore.setState({ pendingFlushThreadId: null })
})

describe("chat runtime reset", () => {
  test("keeps the shell composer height a thread view never measures", () => {
    chatRuntimeStore.getState().setPanelState({ composerHeight: 212 })

    chatRuntimeStore.getState().reset()

    expect(chatRuntimeStore.getState().composerHeight).toBe(212)
  })

  test("clears thread state", () => {
    chatRuntimeStore.getState().setPanelState({
      isReady: true,
      isEmptyThread: false,
      isLoading: true,
    })

    chatRuntimeStore.getState().reset()

    const state = chatRuntimeStore.getState()
    expect(state.isReady).toBe(false)
    expect(state.isEmptyThread).toBe(true)
    expect(state.isLoading).toBe(false)
  })
})

describe("chat runtime pending flush", () => {
  test("flushes once when the flusher registers after the request", async () => {
    const flush = vi.fn()

    chatRuntimeStore.getState().requestPendingFlush("thread-1")
    const unregister = chatRuntimeStore
      .getState()
      .registerPendingFlusher("thread-1", flush)

    await Promise.resolve()

    expect(flush).toHaveBeenCalledTimes(1)
    expect(chatRuntimeStore.getState().pendingFlushThreadId).toBeNull()
    unregister()
  })

  test("flushes once when the request arrives after the flusher", async () => {
    const flush = vi.fn()
    const unregister = chatRuntimeStore
      .getState()
      .registerPendingFlusher("thread-1", flush)

    chatRuntimeStore.getState().requestPendingFlush("thread-1")
    await Promise.resolve()

    expect(flush).toHaveBeenCalledTimes(1)
    unregister()
  })

  test("ignores a flush scheduled by a registration that cleaned up", async () => {
    const first = vi.fn()
    const second = vi.fn()

    chatRuntimeStore.getState().requestPendingFlush("thread-1")
    const unregisterFirst = chatRuntimeStore
      .getState()
      .registerPendingFlusher("thread-1", first)
    unregisterFirst()
    const unregisterSecond = chatRuntimeStore
      .getState()
      .registerPendingFlusher("thread-1", second)

    await Promise.resolve()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    unregisterSecond()
  })
})
