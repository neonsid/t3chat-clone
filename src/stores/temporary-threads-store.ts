import { createStore } from "zustand/vanilla"
import { persist, createJSONStorage } from "zustand/middleware"
import { useStore } from "zustand"

import {
  isJsonNumber,
  isJsonObject,
  isJsonString,
  type JsonValue,
} from "@/lib/json-value"
import {
  TEMPORARY_SIDEBAR_TITLE,
  type PersistableTemporaryMessage,
  type StoredTemporaryThread,
  storedTemporaryThreadsEqual,
} from "@/lib/temporary-chat"
import type { AssistantGenerationStats } from "@/lib/threads"
import {
  TEMPORARY_THREADS_STORAGE_KEY,
  TEMPORARY_THREADS_STORAGE_VERSION,
} from "@/stores/constants"

export type TemporaryThreadsState = {
  isHydrated: boolean
  threads: Record<string, StoredTemporaryThread>
  forgottenThreadIds: Record<string, true>
  markHydrated: () => void
  upsertLiveTranscript: (
    threadId: string,
    snapshot: {
      messages: PersistableTemporaryMessage[]
      generationStats: Record<string, AssistantGenerationStats>
      stoppedMessageIds: string[]
    }
  ) => void
  togglePinned: (threadId: string) => void
  archive: (threadId: string) => void
  rename: (threadId: string, title: string) => void
  removeThread: (threadId: string) => void
}

type PersistedTemporaryThreadsState = {
  threads: Record<string, StoredTemporaryThread>
}

function sanitizeMessage(
  value: JsonValue
): PersistableTemporaryMessage | null {
  if (!isJsonObject(value)) return null
  if (!isJsonString(value.messageId) || !isJsonNumber(value.createdAt)) {
    return null
  }
  if (value.role !== "user" && value.role !== "assistant") return null

  const attachmentIds = Array.isArray(value.attachmentIds)
    ? value.attachmentIds.filter(isJsonString)
    : []

  return {
    messageId: value.messageId,
    role: value.role,
    content: isJsonString(value.content) ? value.content : undefined,
    thinking: isJsonString(value.thinking) ? value.thinking : undefined,
    status:
      value.status === "stopped" || value.status === "failed"
        ? value.status
        : "complete",
    createdAt: value.createdAt,
    attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
  }
}

function sanitizeGenerationStats(value: JsonValue) {
  if (!isJsonObject(value)) return {}

  const stats: Record<string, AssistantGenerationStats> = {}
  for (const [messageId, entry] of Object.entries(value)) {
    if (
      !isJsonObject(entry) ||
      !isJsonString(entry.modelName) ||
      !isJsonString(entry.mode) ||
      !isJsonNumber(entry.outputTokens) ||
      !isJsonNumber(entry.tokensPerSecond) ||
      !isJsonNumber(entry.timeToFirstTokenSeconds)
    ) {
      continue
    }
    stats[messageId] = {
      modelName: entry.modelName,
      mode: entry.mode,
      outputTokens: entry.outputTokens,
      tokensPerSecond: entry.tokensPerSecond,
      timeToFirstTokenSeconds: entry.timeToFirstTokenSeconds,
    }
  }
  return stats
}

function sanitizeThread(value: JsonValue): StoredTemporaryThread | null {
  if (!isJsonObject(value)) return null
  if (
    !isJsonString(value.id) ||
    !isJsonString(value.title) ||
    !isJsonNumber(value.createdAt) ||
    !isJsonNumber(value.updatedAt) ||
    !Array.isArray(value.messages)
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    titleSource:
      value.titleSource === "manual" || value.titleSource === "generated"
        ? value.titleSource
        : "derived",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    pinnedAt: isJsonNumber(value.pinnedAt) ? value.pinnedAt : undefined,
    archivedAt: isJsonNumber(value.archivedAt) ? value.archivedAt : undefined,
    messages: value.messages.flatMap((message) => {
      const sanitized = sanitizeMessage(message)
      return sanitized ? [sanitized] : []
    }),
    generationStats: sanitizeGenerationStats(value.generationStats),
    stoppedMessageIds: Array.isArray(value.stoppedMessageIds)
      ? value.stoppedMessageIds.filter(isJsonString)
      : [],
  }
}

export function sanitizePersistedTemporaryThreads(
  value: JsonValue | null
): PersistedTemporaryThreadsState {
  if (!isJsonObject(value) || !isJsonObject(value.threads)) {
    return { threads: {} }
  }
  const threads: Record<string, StoredTemporaryThread> = {}
  for (const [threadId, thread] of Object.entries(value.threads)) {
    const sanitized = sanitizeThread(thread)
    if (!sanitized || sanitized.id !== threadId) continue
    threads[threadId] = sanitized
  }
  return { threads }
}

function patchThread(
  state: TemporaryThreadsState,
  threadId: string,
  patch: Partial<StoredTemporaryThread>
): TemporaryThreadsState {
  const existing = state.threads[threadId]
  if (!existing) return state
  return {
    ...state,
    threads: {
      ...state.threads,
      [threadId]: { ...existing, ...patch, updatedAt: Date.now() },
    },
  }
}

export const temporaryThreadsStore = createStore<TemporaryThreadsState>()(
  persist(
    (set, get) => ({
      isHydrated: false,
      threads: {},
      forgottenThreadIds: {},
      markHydrated() {
        set({ isHydrated: true })
      },
      upsertLiveTranscript(threadId, snapshot) {
        if (snapshot.messages.length === 0) return
        if (get().forgottenThreadIds[threadId]) return
        const existing = get().threads[threadId]
        const next: StoredTemporaryThread = {
          id: threadId,
          title: existing?.title ?? TEMPORARY_SIDEBAR_TITLE,
          titleSource:
            existing?.titleSource === "manual" ? "manual" : "derived",
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: existing?.updatedAt ?? Date.now(),
          pinnedAt: existing?.pinnedAt,
          archivedAt: existing?.archivedAt,
          messages: snapshot.messages,
          generationStats: snapshot.generationStats,
          stoppedMessageIds: snapshot.stoppedMessageIds,
        }
        if (existing && storedTemporaryThreadsEqual(existing, next)) return
        set({
          threads: {
            ...get().threads,
            [threadId]: { ...next, updatedAt: Date.now() },
          },
        })
      },
      togglePinned(threadId) {
        const existing = get().threads[threadId]
        if (!existing) return
        set(
          patchThread(get(), threadId, {
            pinnedAt: existing.pinnedAt ? undefined : Date.now(),
          })
        )
      },
      archive(threadId) {
        set(patchThread(get(), threadId, { archivedAt: Date.now() }))
      },
      rename(threadId, title) {
        const trimmed = title.trim()
        if (!trimmed) return
        set(
          patchThread(get(), threadId, {
            title: trimmed,
            titleSource: "manual",
          })
        )
      },
      removeThread(threadId) {
        const threads = { ...get().threads }
        delete threads[threadId]
        set({
          threads,
          forgottenThreadIds: {
            ...get().forgottenThreadIds,
            [threadId]: true,
          },
        })
      },
    }),
    {
      name: TEMPORARY_THREADS_STORAGE_KEY,
      version: TEMPORARY_THREADS_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state): PersistedTemporaryThreadsState => ({
        threads: state.threads,
      }),
      merge: (persisted, current): TemporaryThreadsState => {
        // SAFETY: zustand persist returns JSON.parse output from localStorage.
        const persistedJson: JsonValue | null =
          persisted === undefined || persisted === null
            ? null
            : (persisted as JsonValue)
        return {
          ...current,
          threads: sanitizePersistedTemporaryThreads(persistedJson).threads,
        }
      },
    }
  )
)

export function useTemporaryThreadsStore<T>(
  selector: (state: TemporaryThreadsState) => T
): T {
  return useStore(temporaryThreadsStore, selector)
}
