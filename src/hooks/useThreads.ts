import { useCallback, useMemo, useRef, useState } from "react"
import type { UIMessage } from "@tanstack/ai-react"

import {
  createEmptyThread,
  loadThreadState,
  saveThreadState,
  titleFromMessages,
} from "@/lib/threads"
import type { ChatThread } from "@/lib/threads"

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
      state.threads.find((thread) => thread.id === initialThreadId) ??
      state.threads.find((thread) => thread.id === state.activeThreadId) ??
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
      (thread) => thread.messages.length === 0
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

      if (remaining.length === 0) {
        const thread = createEmptyThread()
        commitState({ activeThreadId: thread.id, threads: [thread] })
        return thread
      }

      const activeThreadId =
        current.activeThreadId === threadId
          ? remaining[0].id
          : current.activeThreadId
      const nextState = { activeThreadId, threads: remaining }
      commitState(nextState)
      return (
        remaining.find((thread) => thread.id === activeThreadId) ?? remaining[0]
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

  return {
    activeThread,
    threads: sortedThreads,
    selectThread,
    createThread,
    deleteThread,
    updateThreadMessages,
  }
}
