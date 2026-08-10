// @vitest-environment jsdom

import { act, render } from "@testing-library/react"
import { beforeEach, expect, test, vi } from "vitest"
import { useStore } from "zustand"

import {
  createChatUiStore,
  createThreadStateKey,
  getThreadComposerState,
} from "@/stores/chat-ui-store"
import { createSidebarUiStore } from "@/stores/sidebar-ui-store"
import { createMemoryStorage } from "@/stores/test-utils"

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage())
  vi.stubGlobal("sessionStorage", createMemoryStorage())
})

test("sidebar search does not rerender desktop-open subscribers", () => {
  const store = createSidebarUiStore()
  let renders = 0

  function DesktopOpenSubscriber() {
    useStore(store, (state) => state.desktopOpen)
    renders += 1
    return null
  }

  render(<DesktopOpenSubscriber />)
  expect(renders).toBe(1)

  act(() => store.getState().setSearchQuery("hello"))
  expect(renders).toBe(1)

  act(() => store.getState().setDesktopOpen(false))
  expect(renders).toBe(2)
})

test("editing one draft does not rerender another thread subscriber", () => {
  const store = createChatUiStore()
  const first = createThreadStateKey("user-1", "thread-1")
  const second = createThreadStateKey("user-1", "thread-2")
  let renders = 0

  function FirstDraftSubscriber() {
    useStore(store, (state) => getThreadComposerState(state, first).draft)
    renders += 1
    return null
  }

  render(<FirstDraftSubscriber />)
  expect(renders).toBe(1)

  act(() => store.getState().setDraft(second, "Second"))
  expect(renders).toBe(1)

  act(() => store.getState().setDraft(first, "First"))
  expect(renders).toBe(2)
})
