import { useCallback, useEffect, useMemo, useState } from "react"
import type { UIMessage } from "@tanstack/ai-react"

import {
  createEmptyThread,
  loadThreadState,
  saveThreadState,
  titleFromMessages,
} from "@/lib/threads"
import type { ChatThread } from "@/lib/threads"

export function useThreads() {
  const [state, setState] = useState(() => loadThreadState())

  useEffect(() => {
    saveThreadState(state)
  }, [state])

  const activeThread = useMemo(
    () =>
      state.threads.find((thread) => thread.id === state.activeThreadId) ??
      state.threads[0],
    [state.activeThreadId, state.threads]
  )

  const sortedThreads = useMemo(
    () =>
      [...state.threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [state.threads]
  )

  const selectThread = useCallback((threadId: string) => {
    setState((current) => {
      if (!current.threads.some((thread) => thread.id === threadId)) {
        return current
      }
      return { ...current, activeThreadId: threadId }
    })
  }, [])

  const createThread = useCallback(() => {
    const thread = createEmptyThread()
    setState((current) => ({
      activeThreadId: thread.id,
      threads: [thread, ...current.threads],
    }))
    return thread
  }, [])

  const deleteThread = useCallback((threadId: string) => {
    setState((current) => {
      const remaining = current.threads.filter((thread) => thread.id !== threadId)
      if (remaining.length === 0) {
        const thread = createEmptyThread()
        return { activeThreadId: thread.id, threads: [thread] }
      }

      const activeThreadId =
        current.activeThreadId === threadId
          ? remaining[0].id
          : current.activeThreadId

      return { activeThreadId, threads: remaining }
    })
  }, [])

  const updateActiveMessages = useCallback((messages: UIMessage[]) => {
    setState((current) => {
      const active = current.threads.find(
        (thread) => thread.id === current.activeThreadId
      )
      if (!active || active.messages === messages) {
        return current
      }

      const nextThread: ChatThread = {
        ...active,
        messages,
        updatedAt: Date.now(),
        title: titleFromMessages(messages),
      }

      return {
        ...current,
        threads: current.threads.map((thread) =>
          thread.id === nextThread.id ? nextThread : thread
        ),
      }
    })
  }, [])

  return {
    activeThread,
    threads: sortedThreads,
    selectThread,
    createThread,
    deleteThread,
    updateActiveMessages,
  }
}
