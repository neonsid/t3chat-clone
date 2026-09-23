import { useLayoutEffect, useRef } from "react"

import type { ReasoningEffort } from "@/lib/chat-models"
import type { PersistableTemporaryMessage } from "@/lib/temporary-chat"
import type { AssistantGenerationStats } from "@/lib/threads"
import { chatRuntimeStore } from "@/stores/chat-runtime-store"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"

export function useChatThreadRuntimeBinding({
  threadId,
  isReady,
  isAuthenticated,
  isTemporary,
  isLoading,
  error,
  isEmptyThread,
  lastMessageRole,
  effectiveReasoningEffort,
  supportedReasoningEfforts,
  modelLoading,
  messagesLength,
  persistableMessages,
  generationStats,
  stoppedMessageIds,
  submit,
  stop,
  flushPending,
}: {
  threadId: string
  isReady: boolean
  isAuthenticated: boolean
  isTemporary: boolean
  isLoading: boolean
  error: Error | undefined
  isEmptyThread: boolean
  lastMessageRole: string | undefined
  effectiveReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  modelLoading: boolean
  messagesLength: number
  persistableMessages: () => PersistableTemporaryMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  stoppedMessageIds: ReadonlyArray<string>
  submit: () => void
  stop: () => void
  flushPending: () => void
}) {
  const persistableMessagesRef = useRef(persistableMessages)
  persistableMessagesRef.current = persistableMessages
  const submitRef = useRef(submit)
  submitRef.current = submit
  const stopRef = useRef(stop)
  stopRef.current = stop
  const flushPendingRef = useRef(flushPending)
  flushPendingRef.current = flushPending

  useLayoutEffect(() => {
    return chatRuntimeStore.getState().bindActions({
      submit: () => submitRef.current(),
      stop: () => stopRef.current(),
    })
  }, [threadId])

  useLayoutEffect(() => {
    return chatRuntimeStore
      .getState()
      .bindPersistableMessages(() => persistableMessagesRef.current())
  }, [threadId])

  useLayoutEffect(() => {
    if (!isTemporary || messagesLength === 0) return
    if (isLoading && lastMessageRole !== "user") return
    temporaryThreadsStore.getState().upsertLiveTranscript(threadId, {
      messages: persistableMessagesRef.current(),
      generationStats,
      stoppedMessageIds: [...stoppedMessageIds],
    })
  }, [
    generationStats,
    isLoading,
    isTemporary,
    lastMessageRole,
    messagesLength,
    stoppedMessageIds,
    threadId,
  ])

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return
    return chatRuntimeStore
      .getState()
      .registerPendingFlusher(threadId, () => flushPendingRef.current())
  }, [isAuthenticated, isReady, threadId])

  useLayoutEffect(() => {
    chatRuntimeStore.getState().setPanelState({
      isLoading,
      error: error ?? null,
      isReady,
      isEmptyThread,
      effectiveReasoningEffort,
      supportedReasoningEfforts,
      modelLoading,
    })
  }, [
    effectiveReasoningEffort,
    error,
    isEmptyThread,
    isLoading,
    isReady,
    modelLoading,
    supportedReasoningEfforts,
  ])

  useLayoutEffect(() => {
    return () => {
      chatRuntimeStore.getState().reset()
    }
  }, [threadId])

  useLayoutEffect(() => {
    if (isLoading || error) chatRuntimeStore.getState().setActiveTurn(false)
  }, [error, isLoading])
}
