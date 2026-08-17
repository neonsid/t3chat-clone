import { createStore } from "zustand/vanilla"
import { devtools, persist, createJSONStorage } from "zustand/middleware"

import { isReasoningEffort } from "@/lib/chat-models"
import {
  isJsonBoolean,
  isJsonObject,
  isJsonString,
  type JsonValue,
} from "@/lib/json-value"
import {
  CHAT_UI_STORAGE_KEY,
  CHAT_UI_STORAGE_VERSION,
  DEFAULT_THREAD_COMPOSER_STATE,
} from "@/stores/constants"
import type { ComposerAttachment, ThreadComposerState } from "@/stores/types"

export type PendingSubmission = {
  messageId: string
  content: string
  attachmentIds: string[]
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
  setAttachments: (key: string, attachments: Array<ComposerAttachment>) => void
  updateAttachment: (
    key: string,
    localId: string,
    patch: Partial<ComposerAttachment>
  ) => void
  removeAttachment: (key: string, localId: string) => void
  clearAttachments: (key: string, options?: { revoke?: boolean }) => void
  clearDraft: (key: string) => void
  moveThreadState: (fromKey: string, toKey: string) => void
  removeThreadState: (key: string) => void
  queuePendingSubmission: (
    threadId: string,
    content: string,
    attachmentIds?: string[]
  ) => void
  peekPendingSubmission: (threadId: string) => PendingSubmission | null
  takePendingSubmission: (threadId: string) => PendingSubmission | null
}

type PersistedComposer = Pick<
  ThreadComposerState,
  "draft" | "reasoningEffort" | "searchEnabled"
>
type PersistedChatUiState = {
  composers: Partial<Record<string, PersistedComposer>>
}

function revokePreviewUrls(attachments: Array<ComposerAttachment>) {
  for (const attachment of attachments) {
    if (attachment.localPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.localPreviewUrl)
    }
  }
}

function isDefaultComposerState(state: ThreadComposerState): boolean {
  return (
    state.draft === DEFAULT_THREAD_COMPOSER_STATE.draft &&
    state.reasoningEffort === DEFAULT_THREAD_COMPOSER_STATE.reasoningEffort &&
    state.searchEnabled === DEFAULT_THREAD_COMPOSER_STATE.searchEnabled &&
    state.attachments.length === 0
  )
}

function sanitizeComposer(value: JsonValue): ThreadComposerState | null {
  if (!isJsonObject(value)) return null
  const draft = value.draft
  const reasoningEffort = value.reasoningEffort
  const searchEnabled = value.searchEnabled
  if (
    !isJsonString(draft) ||
    !isJsonString(reasoningEffort) ||
    !isReasoningEffort(reasoningEffort) ||
    !isJsonBoolean(searchEnabled)
  ) {
    return null
  }

  return {
    draft,
    reasoningEffort,
    searchEnabled,
    // Never restore in-flight uploads from session storage.
    attachments: [],
  }
}

function sanitizePersistedState(value: JsonValue): PersistedChatUiState {
  if (!isJsonObject(value)) return { composers: {} }
  const composersValue = value.composers
  if (!isJsonObject(composersValue)) {
    return { composers: {} }
  }

  const composers = Object.fromEntries(
    Object.entries(composersValue).flatMap(([key, composer]) => {
      const sanitized = sanitizeComposer(composer)
      if (!sanitized || isDefaultComposerState(sanitized)) return []
      return [
        [
          key,
          {
            draft: sanitized.draft,
            reasoningEffort: sanitized.reasoningEffort,
            searchEnabled: sanitized.searchEnabled,
          },
        ],
      ]
    })
  )
  return { composers }
}

function updateComposer(
  state: ChatUiState,
  key: string,
  patch: Partial<ThreadComposerState>
) {
  const current = state.composers[key] ?? DEFAULT_THREAD_COMPOSER_STATE
  const next = {
    ...current,
    attachments: current.attachments,
    ...patch,
  }
  const composers = {
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

export function composerCanSend(
  composer: ThreadComposerState,
  options?: { isLoading?: boolean; disabled?: boolean }
): boolean {
  if (options?.isLoading || options?.disabled) return false
  const hasText = composer.draft.trim().length > 0
  const attachments = composer.attachments
  if (attachments.some((attachment) => attachment.status !== "ready")) {
    return false
  }
  const readyCount = attachments.filter(
    (attachment) => attachment.status === "ready" && attachment.attachmentId
  ).length
  return hasText || readyCount > 0
}

export function readyAttachmentIds(composer: ThreadComposerState): string[] {
  return composer.attachments.flatMap((attachment) =>
    attachment.status === "ready" && attachment.attachmentId
      ? [attachment.attachmentId]
      : []
  )
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
      setAttachments(key, attachments) {
        set((state) => {
          const previous =
            state.composers[key]?.attachments ??
            DEFAULT_THREAD_COMPOSER_STATE.attachments
          const keep = new Set(
            attachments.map((attachment) => attachment.localPreviewUrl)
          )
          revokePreviewUrls(
            previous.filter(
              (attachment) =>
                attachment.localPreviewUrl &&
                !keep.has(attachment.localPreviewUrl)
            )
          )
          return {
            composers: updateComposer(state, key, { attachments }),
          }
        })
      },
      updateAttachment(key, localId, patch) {
        set((state) => {
          const current =
            state.composers[key]?.attachments ??
            DEFAULT_THREAD_COMPOSER_STATE.attachments
          const attachments = current.map((attachment) =>
            attachment.localId === localId
              ? { ...attachment, ...patch }
              : attachment
          )
          return {
            composers: updateComposer(state, key, { attachments }),
          }
        })
      },
      removeAttachment(key, localId) {
        set((state) => {
          const current =
            state.composers[key]?.attachments ??
            DEFAULT_THREAD_COMPOSER_STATE.attachments
          const removed = current.find(
            (attachment) => attachment.localId === localId
          )
          if (removed?.localPreviewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(removed.localPreviewUrl)
          }
          return {
            composers: updateComposer(state, key, {
              attachments: current.filter(
                (attachment) => attachment.localId !== localId
              ),
            }),
          }
        })
      },
      clearAttachments(key, options) {
        set((state) => {
          const current =
            state.composers[key]?.attachments ??
            DEFAULT_THREAD_COMPOSER_STATE.attachments
          if (options?.revoke !== false) revokePreviewUrls(current)
          return {
            composers: updateComposer(state, key, { attachments: [] }),
          }
        })
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
        const existing = get().composers[key]
        if (!existing) return
        revokePreviewUrls(existing.attachments)
        set((state) => {
          const composers = { ...state.composers }
          delete composers[key]
          return { composers }
        })
      },
      queuePendingSubmission(threadId, content, attachmentIds = []) {
        const trimmed = content.trim()
        if (!trimmed && attachmentIds.length === 0) return
        set((state) => ({
          pendingSubmissions: {
            ...state.pendingSubmissions,
            [threadId]: {
              messageId: crypto.randomUUID(),
              content: trimmed,
              attachmentIds,
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
        // Exclude attachments entirely — blob URLs and mid-upload state must
        // not survive reload.
        composers: Object.fromEntries(
          Object.entries(state.composers).flatMap(([key, composer]) => {
            if (!composer) return []
            return [
              [
                key,
                {
                  draft: composer.draft,
                  reasoningEffort: composer.reasoningEffort,
                  searchEnabled: composer.searchEnabled,
                },
              ],
            ]
          })
        ),
      }),
      merge: (persisted, current): ChatUiState => {
        // SAFETY: zustand persist returns JSON.parse output from sessionStorage.
        const persistedJson: JsonValue | null =
          persisted === undefined || persisted === null
            ? null
            : (persisted as JsonValue)
        const sanitized = persistedJson
          ? sanitizePersistedState(persistedJson)
          : { composers: {} }
        // SAFETY: accumulator starts empty and is filled only with sanitized composers.
        const composers = {} as ChatUiState["composers"]
        for (const [key, composer] of Object.entries(sanitized.composers)) {
          if (!composer) continue
          composers[key] = {
            draft: composer.draft,
            reasoningEffort: composer.reasoningEffort,
            searchEnabled: composer.searchEnabled,
            attachments: [],
          }
        }
        return {
          ...current,
          composers,
        }
      },
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
