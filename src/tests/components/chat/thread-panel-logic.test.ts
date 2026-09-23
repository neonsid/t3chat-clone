import { describe, expect, it } from "vitest"

import {
  resolveThreadPanelView,
  type ThreadPanelRouteState,
} from "@/components/chat/thread-panel-logic"

function state(
  patch: Partial<ThreadPanelRouteState> = {}
): ThreadPanelRouteState {
  return {
    isTemporary: false,
    isTemporaryThreadsHydrated: true,
    storedTemporaryThreadMissing: true,
    currentThreadHadPendingSubmission: false,
    activeThreadMissing: false,
    isDraft: false,
    isRouteDataReady: true,
    isChatUiHydrated: true,
    isChatDataReady: true,
    renderedThreadEmpty: false,
    isSignedIn: true,
    isAuthenticated: true,
    wasCurrentThreadReady: true,
    ...patch,
  }
}

describe("resolveThreadPanelView", () => {
  it("waits for temporary-thread hydration", () => {
    expect(
      resolveThreadPanelView(
        state({
          isTemporary: true,
          isTemporaryThreadsHydrated: false,
        })
      )
    ).toBe("loading")
  })

  it("redirects a missing temporary thread with no pending submit", () => {
    expect(
      resolveThreadPanelView(
        state({
          isTemporary: true,
          isTemporaryThreadsHydrated: true,
          storedTemporaryThreadMissing: true,
        })
      )
    ).toBe("redirect")
  })

  it("keeps a missing temporary thread while a submit is in flight", () => {
    expect(
      resolveThreadPanelView(
        state({
          isTemporary: true,
          isTemporaryThreadsHydrated: true,
          storedTemporaryThreadMissing: true,
          currentThreadHadPendingSubmission: true,
        })
      )
    ).toBe("render")
  })

  it("redirects a missing persisted thread", () => {
    expect(resolveThreadPanelView(state({ activeThreadMissing: true }))).toBe(
      "redirect"
    )
  })

  it("redirects an empty persisted thread with no pending submit", () => {
    expect(resolveThreadPanelView(state({ renderedThreadEmpty: true }))).toBe(
      "redirect"
    )
  })

  it("redirects a signed-in client that is not authenticated yet", () => {
    expect(
      resolveThreadPanelView(
        state({
          isSignedIn: true,
          isAuthenticated: false,
        })
      )
    ).toBe("redirect")
  })

  it("holds the panel until the first ready snapshot for this thread", () => {
    expect(
      resolveThreadPanelView(
        state({
          isChatDataReady: false,
          wasCurrentThreadReady: false,
          currentThreadHadPendingSubmission: false,
        })
      )
    ).toBe("loading")
  })

  it("renders a draft before Convex data is ready", () => {
    expect(
      resolveThreadPanelView(
        state({
          isDraft: true,
          isChatDataReady: false,
          wasCurrentThreadReady: false,
        })
      )
    ).toBe("render")
  })
})
