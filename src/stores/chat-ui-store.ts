import { createStore } from "zustand/vanilla"
import { devtools, persist, createJSONStorage } from "zustand/middleware"

import { isReasoningEffort } from "@/lib/chat-models"
import {
  CHAT_UI_STORAGE_KEY,
  CHAT_UI_STORAGE_VERSION,
  DEFAULT_THREAD_COMPOSER_STATE,
} from "@/stores/constants"
import type { ThreadComposerState } from "@/stores/types"

export type PendingSubmission = {
  messageId: string
  content: string
}

export type ChatUiState = {
  composers: Partial<Record<string, ThreadComposerState>>
  pendingSubmissions: Partial<Record<string, PendingSubmission>>
  isHydrated: boolean
  markHydrated: () => void
  setDraft: (key: string, draft: string) => void
  setReasoningEffort: (
    key: string,
    reasoningEffort: ThreadComposerState["reasoningEffort"]
  ) => void
  setSearchEnabled: (key: string, searchEnabled: boolean) => void
  clearDraft: (key: string) => void
  moveThreadState: (fromKey: string, toKey: string) => void
  removeThreadState: (key: string) => void
  queuePendingSubmission: (threadId: string, content: string) => void
  peekPendingSubmission: (threadId: string) => PendingSubmission | null
  takePendingSubmission: (threadId: string) => PendingSubmission | null
}

type PersistedChatUiState = Pick<ChatUiState, "composers">

function isDefaultComposerState(state: ThreadComposerState): boolean {
  return (
    state.draft === DEFAULT_THREAD_COMPOSER_STATE.draft &&
    state.reasoningEffort === DEFAULT_THREAD_COMPOSER_STATE.reasoningEffort &&
    state.searchEnabled === DEFAULT_THREAD_COMPOSER_STATE.searchEnabled
  )
}

function sanitizeComposer(value: unknown): ThreadComposerState | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ThreadComposerState>
  if (
    typeof candidate.draft !== "string" ||
    !isReasoningEffort(candidate.reasoningEffort) ||
    typeof candidate.searchEnabled !== "boolean"
  ) {
    return null
  }

  return {
    draft: candidate.draft,
    reasoningEffort: candidate.reasoningEffort,
    searchEnabled: candidate.searchEnabled,
  }
}

function sanitizePersistedState(value: unknown): PersistedChatUiState {
  if (!value || typeof value !== "object") return { composers: {} }
  const candidate = value as { composers?: unknown }
  if (!candidate.composers || typeof candidate.composers !== "object") {
    return { composers: {} }
  }

  const composers = Object.fromEntries(
    Object.entries(candidate.composers).flatMap(([key, composer]) => {
      const sanitized = sanitizeComposer(composer)
      return sanitized && !isDefaultComposerState(sanitized)
        ? [[key, sanitized]]
        : []
    })
  )
  return { composers }
}

function updateComposer(
  state: ChatUiState,
  key: string,
  patch: Partial<ThreadComposerState>
): Partial<Record<string, ThreadComposerState>> {
  const current = state.composers[key] ?? DEFAULT_THREAD_COMPOSER_STATE
  const next = { ...current, ...patch }
  const composers: Partial<Record<string, ThreadComposerState>> = {
    ...state.composers,
  }

  if (isDefaultComposerState(next)) delete composers[key]
  else composers[key] = next

  return composers
}

export function getThreadComposerState(
  state: ChatUiState,
  key: string
): ThreadComposerState {
  return state.composers[key] ?? DEFAULT_THREAD_COMPOSER_STATE
}

export function createThreadStateKey(
  userId: string | null | undefined,
  threadId: string
): string {
  return `${userId ? `user:${userId}` : "guest"}:${threadId}`
}

export function createChatUiStore() {
  const initializer = persist<ChatUiState, [], [], PersistedChatUiState>(
    (set, get) => ({
      composers: {},
      pendingSubmissions: {},
      isHydrated: false,
      markHydrated() {
        set({ isHydrated: true })
      },
      setDraft(key, draft) {
        set((state) => ({ composers: updateComposer(state, key, { draft }) }))
      },
      setReasoningEffort(key, reasoningEffort) {
        set((state) => ({
          composers: updateComposer(state, key, { reasoningEffort }),
        }))
      },
      setSearchEnabled(key, searchEnabled) {
        set((state) => ({
          composers: updateComposer(state, key, { searchEnabled }),
        }))
      },
      clearDraft(key) {
        set((state) => ({
          composers: updateComposer(state, key, { draft: "" }),
        }))
      },
      moveThreadState(fromKey, toKey) {
        const source = get().composers[fromKey]
        if (!source || fromKey === toKey) return
        set((state) => {
          const composers = { ...state.composers, [toKey]: source }
          delete composers[fromKey]
          return { composers }
        })
      },
      removeThreadState(key) {
        if (!get().composers[key]) return
        set((state) => {
          const composers = { ...state.composers }
          delete composers[key]
          return { composers }
        })
      },
      queuePendingSubmission(threadId, content) {
        const trimmed = content.trim()
        if (!trimmed) return
        set((state) => ({
          pendingSubmissions: {
            ...state.pendingSubmissions,
            [threadId]: {
              messageId: crypto.randomUUID(),
              content: trimmed,
            },
          },
        }))
      },
      peekPendingSubmission(threadId) {
        return get().pendingSubmissions[threadId] ?? null
      },
      // Read and remove in one step so a repeated mount can never dispatch the
      // same first turn twice.
      takePendingSubmission(threadId) {
        const pending = get().pendingSubmissions[threadId]
        if (!pending) return null
        set((state) => {
          const pendingSubmissions = { ...state.pendingSubmissions }
          delete pendingSubmissions[threadId]
          return { pendingSubmissions }
        })
        return pending
      },
    }),
    {
      name: CHAT_UI_STORAGE_KEY,
      version: CHAT_UI_STORAGE_VERSION,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state): PersistedChatUiState => ({
        composers: state.composers,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedState(persisted),
      }),
    }
  )
  if (import.meta.env.DEV) {
    return createStore<ChatUiState>()(
      devtools(initializer, { name: "Chat UI" })
    )
  }
  return createStore<ChatUiState>()(initializer)
}

export type ChatUiStore = ReturnType<typeof createChatUiStore>
