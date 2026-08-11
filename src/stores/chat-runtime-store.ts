import { createStore } from "zustand/vanilla"
import { useStore } from "zustand"

import type { ReasoningEffort } from "@/lib/chat-models"
import {
  CHAT_MODEL_CONFIG,
  DEFAULT_CHAT_MODEL_ID,
} from "@/lib/chat-models"

export type ChatRuntimeState = {
  isLoading: boolean
  error: Error | null
  isReady: boolean
  isEmptyThread: boolean
  messagesLoading: boolean
  // A turn is "active" from the synchronous click through the draft→thread
  // handoff (thread creation + navigation remounts the thread view). It bridges
  // that gap so the composer button and empty state don't flip back while the
  // real stream's isLoading is briefly false. Lives on this module singleton so
  // it survives the remount; cleared once the real turn's isLoading takes over.
  activeTurn: boolean
  // The submitted text, held so the thread view can paint an optimistic user
  // bubble during the handoff. Without it the pending dots render alone and get
  // shoved down once the real user message is dispatched after navigation.
  activeTurnContent: string
  // Set by the draft submit path after navigate; the thread view's registered
  // flusher consumes it. Survives the draft→thread remount (not cleared by reset).
  pendingFlushThreadId: string | null
  effectiveReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: readonly ReasoningEffort[]
  modelLoading: boolean
  submit: (() => void) | null
  stop: (() => void) | null
  setPanelState: (
    state: Partial<
      Pick<
        ChatRuntimeState,
        | "isLoading"
        | "error"
        | "isReady"
        | "isEmptyThread"
        | "messagesLoading"
        | "effectiveReasoningEffort"
        | "supportedReasoningEfforts"
        | "modelLoading"
      >
    >
  ) => void
  setActiveTurn: (activeTurn: boolean, content?: string) => void
  requestPendingFlush: (threadId: string) => void
  registerPendingFlusher: (
    threadId: string,
    flush: () => void
  ) => () => void
  bindActions: (actions: {
    submit: () => void
    stop: () => void
  }) => () => void
  reset: () => void
}

const initialThreadState = {
  isLoading: false,
  error: null,
  isReady: false,
  isEmptyThread: true,
  messagesLoading: false,
  activeTurn: false,
  activeTurnContent: "",
  effectiveReasoningEffort: CHAT_MODEL_CONFIG[DEFAULT_CHAT_MODEL_ID]
    .defaultReasoningEffort,
  supportedReasoningEfforts: CHAT_MODEL_CONFIG[DEFAULT_CHAT_MODEL_ID]
    .supportedReasoningEfforts,
  modelLoading: false,
  submit: null,
  stop: null,
}

// Module-level so registration is not React state and can coordinate with the
// navigate-side request across the draft→thread remount.
const pendingFlushers = new Map<string, () => void>()
const flushEpochs = new Map<string, number>()

function bumpFlushEpoch(threadId: string) {
  flushEpochs.set(threadId, (flushEpochs.get(threadId) ?? 0) + 1)
}

function schedulePendingFlush(
  threadId: string,
  getPendingFlushThreadId: () => string | null,
  clearPendingFlushThreadId: () => void
) {
  const epoch = flushEpochs.get(threadId) ?? 0
  queueMicrotask(() => {
    if ((flushEpochs.get(threadId) ?? 0) !== epoch) return
    if (getPendingFlushThreadId() !== threadId) return
    const flush = pendingFlushers.get(threadId)
    if (!flush) return
    clearPendingFlushThreadId()
    flush()
  })
}

export const chatRuntimeStore = createStore<ChatRuntimeState>()((set, get) => ({
  ...initialThreadState,
  pendingFlushThreadId: null,
  setPanelState(state) {
    set(state)
  },
  setActiveTurn(activeTurn, content) {
    set({
      activeTurn,
      activeTurnContent: activeTurn ? (content ?? "") : "",
    })
  },
  requestPendingFlush(threadId) {
    set({ pendingFlushThreadId: threadId })
    if (!pendingFlushers.has(threadId)) return
    schedulePendingFlush(
      threadId,
      () => get().pendingFlushThreadId,
      () => set({ pendingFlushThreadId: null })
    )
  },
  registerPendingFlusher(threadId, flush) {
    pendingFlushers.set(threadId, flush)
    if (get().pendingFlushThreadId === threadId) {
      schedulePendingFlush(
        threadId,
        () => get().pendingFlushThreadId,
        () => set({ pendingFlushThreadId: null })
      )
    }
    return () => {
      if (pendingFlushers.get(threadId) === flush) {
        pendingFlushers.delete(threadId)
      }
      // Invalidate microtasks from this registration so a StrictMode (or other)
      // remount's cleanup cannot let an aborted run's flush reach the network.
      bumpFlushEpoch(threadId)
    }
  },
  bindActions(actions) {
    set({ submit: actions.submit, stop: actions.stop })
    return () => {
      set({ submit: null, stop: null })
    }
  },
  // The thread view resets on unmount, which happens mid-handoff when the draft
  // route swaps to the thread route. Preserve activeTurn so the composer stays
  // "sending" across that remount; pendingFlushThreadId is untouched so the
  // flush request still reaches the new thread view. Composer overlay height is
  // a CSS var on [data-chat-shell], not React state, so it survives too.
  reset() {
    set((state) => ({
      ...initialThreadState,
      activeTurn: state.activeTurn,
      activeTurnContent: state.activeTurnContent,
    }))
  },
}))

export function useChatRuntimeStore<T>(
  selector: (state: ChatRuntimeState) => T
): T {
  return useStore(chatRuntimeStore, selector)
}
