export type ThreadPanelView = "loading" | "redirect" | "render"

export type ThreadPanelRouteState = {
  isTemporary: boolean
  isTemporaryThreadsHydrated: boolean
  storedTemporaryThreadMissing: boolean
  currentThreadHadPendingSubmission: boolean
  activeThreadMissing: boolean
  isDraft: boolean
  isRouteDataReady: boolean
  isChatUiHydrated: boolean
  isChatDataReady: boolean
  renderedThreadEmpty: boolean
  isSignedIn: boolean | undefined
  isAuthenticated: boolean
  wasCurrentThreadReady: boolean
}

export function resolveThreadPanelView(
  state: ThreadPanelRouteState
): ThreadPanelView {
  if (state.isTemporary && !state.isTemporaryThreadsHydrated) {
    return "loading"
  }

  if (
    state.isTemporary &&
    state.isTemporaryThreadsHydrated &&
    state.storedTemporaryThreadMissing &&
    !state.currentThreadHadPendingSubmission
  ) {
    return "redirect"
  }

  if (state.activeThreadMissing) {
    return "redirect"
  }

  if (
    !state.isDraft &&
    !state.isTemporary &&
    state.isRouteDataReady &&
    state.isChatUiHydrated &&
    state.isChatDataReady &&
    state.renderedThreadEmpty &&
    !state.currentThreadHadPendingSubmission
  ) {
    return "redirect"
  }

  if (
    !state.isDraft &&
    !state.isTemporary &&
    state.isRouteDataReady &&
    state.isSignedIn &&
    !state.isAuthenticated
  ) {
    return "redirect"
  }

  if (!(
    state.isDraft ||
    state.isTemporary ||
    state.isChatDataReady ||
    state.wasCurrentThreadReady ||
    state.currentThreadHadPendingSubmission
  )) {
    return "loading"
  }

  return "render"
}
