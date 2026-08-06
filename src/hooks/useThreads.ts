import { useCallback, useMemo, useRef, useState } from "react"
import type { UIMessage } from "@tanstack/ai-react"

import {
  createEmptyThread,
  loadThreadState,
  saveThreadState,
  titleFromMessages,
} from "@/lib/threads"
import type { AssistantGenerationStats, ChatThread } from "@/lib/threads"

export function useThreads(initialThreadId?: string) {
  const [state, setState] = useState(() => loadThreadState())
  const stateRef = useRef(state)

  const commitState = useCallback((nextState: typeof state) => {
    stateRef.current = nextState
    setState(nextState)
    saveThreadState(nextState)
  }, [])

  const activeThread = useMemo(
    () =>
      state.threads.find(
        (thread) => thread.id === initialThreadId && !thread.archivedAt
      ) ??
      state.threads.find(
        (thread) => thread.id === state.activeThreadId && !thread.archivedAt
      ) ??
      state.threads.find((thread) => !thread.archivedAt) ??
      state.threads[0],
    [initialThreadId, state.activeThreadId, state.threads]
  )

  const sortedThreads = useMemo(
    () => [...state.threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [state.threads]
  )

  const selectThread = useCallback(
    (threadId: string) => {
      const current = stateRef.current
      const thread = current.threads.find((item) => item.id === threadId)
      if (!thread) return undefined

      if (current.activeThreadId !== threadId) {
        commitState({ ...current, activeThreadId: threadId })
      }
      return thread
    },
    [commitState]
  )

  const createThread = useCallback(() => {
    const current = stateRef.current
    const existingEmptyThread = current.threads.find(
      (thread) => thread.messages.length === 0 && !thread.archivedAt
    )

    if (existingEmptyThread) {
      if (current.activeThreadId !== existingEmptyThread.id) {
        commitState({ ...current, activeThreadId: existingEmptyThread.id })
      }
      return existingEmptyThread
    }

    const thread = createEmptyThread()
    commitState({
      activeThreadId: thread.id,
      threads: [thread, ...current.threads],
    })
    return thread
  }, [commitState])

  const deleteThread = useCallback(
    (threadId: string) => {
      const current = stateRef.current
      const remaining = current.threads.filter(
        (thread) => thread.id !== threadId
      )
      if (remaining.length === current.threads.length) {
        return (
          current.threads.find(
            (thread) => thread.id === current.activeThreadId
          ) ?? current.threads[0]
        )
      }

      const visibleRemaining = remaining.filter((thread) => !thread.archivedAt)
      if (visibleRemaining.length === 0) {
        const thread = createEmptyThread()
        commitState({
          activeThreadId: thread.id,
          threads: [thread, ...remaining],
        })
        return thread
      }

      const activeThreadId =
        current.activeThreadId === threadId
          ? visibleRemaining[0].id
          : current.activeThreadId
      const nextState = { activeThreadId, threads: remaining }
      commitState(nextState)
      return (
        visibleRemaining.find((thread) => thread.id === activeThreadId) ??
        visibleRemaining[0]
      )
    },
    [commitState]
  )

  const updateThreadMessages = useCallback(
    (threadId: string, messages: UIMessage[]) => {
      const current = stateRef.current
      const thread = current.threads.find((item) => item.id === threadId)
      if (!thread || thread.messages === messages) return

      const nextThread: ChatThread = {
        ...thread,
        messages,
        updatedAt: Date.now(),
        title: titleFromMessages(messages),
      }

      commitState({
        ...current,
        threads: current.threads.map((item) =>
          item.id === nextThread.id ? nextThread : item
        ),
      })
    },
    [commitState]
  )

  const updateThreadGenerationStats = useCallback(
    (
      threadId: string,
      messageId: string,
      generationStats: AssistantGenerationStats
    ) => {
      const current = stateRef.current
      const thread = current.threads.find((item) => item.id === threadId)
      if (!thread) return

      const nextThread: ChatThread = {
        ...thread,
        generationStats: {
          ...thread.generationStats,
          [messageId]: generationStats,
        },
      }

      commitState({
        ...current,
        threads: current.threads.map((item) =>
          item.id === nextThread.id ? nextThread : item
        ),
      })
    },
    [commitState]
  )

  const toggleThreadPinned = useCallback(
    (threadId: string) => {
      const current = stateRef.current
      const thread = current.threads.find((item) => item.id === threadId)
      if (!thread || thread.archivedAt) return

      commitState({
        ...current,
        threads: current.threads.map((item) =>
          item.id === threadId
            ? {
                ...item,
                pinnedAt: item.pinnedAt ? undefined : Date.now(),
              }
            : item
        ),
      })
    },
    [commitState]
  )

  const archiveThread = useCallback(
    (threadId: string) => {
      const current = stateRef.current
      const thread = current.threads.find((item) => item.id === threadId)
      if (!thread || thread.archivedAt) {
        return current.threads.find(
          (item) => item.id === current.activeThreadId && !item.archivedAt
        )
      }

      const archivedAt = Date.now()
      const remainingThreads = current.threads.map((item) =>
        item.id === threadId
          ? { ...item, archivedAt, pinnedAt: undefined }
          : item
      )
      const nextVisibleThread = remainingThreads.find(
        (item) => !item.archivedAt
      )

      if (!nextVisibleThread) {
        const nextThread = createEmptyThread()
        commitState({
          activeThreadId: nextThread.id,
          threads: [nextThread, ...remainingThreads],
        })
        return nextThread
      }

      commitState({
        activeThreadId:
          current.activeThreadId === threadId
            ? nextVisibleThread.id
            : current.activeThreadId,
        threads: remainingThreads,
      })
      return nextVisibleThread
    },
    [commitState]
  )

  const renameThread = useCallback(
    (threadId: string, title: string) => {
      const nextTitle = title.trim()
      if (!nextTitle) return

      const current = stateRef.current
      commitState({
        ...current,
        threads: current.threads.map((thread) =>
          thread.id === threadId ? { ...thread, title: nextTitle } : thread
        ),
      })
    },
    [commitState]
  )

  const regenerateThreadTitle = useCallback(
    (threadId: string) => {
      const current = stateRef.current
      commitState({
        ...current,
        threads: current.threads.map((thread) =>
          thread.id === threadId
            ? { ...thread, title: titleFromMessages(thread.messages) }
            : thread
        ),
      })
    },
    [commitState]
  )

  return {
    activeThread,
    threads: sortedThreads,
    selectThread,
    createThread,
    deleteThread,
    updateThreadMessages,
    updateThreadGenerationStats,
    toggleThreadPinned,
    archiveThread,
    renameThread,
    regenerateThreadTitle,
  }
}
