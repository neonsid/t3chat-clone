import { useMemo, useRef } from "react"
import { useConvexAuth, useQuery } from "convex/react"
import type { UIMessage } from "@tanstack/ai-react"

import { api } from "../../convex/_generated/api"
import {
  createMessageProjectionCache,
  createPendingChatThread,
  toChatThread,
} from "@/lib/threads"
import type {
  AssistantGenerationStats,
  MessageProjectionCache,
} from "@/lib/threads"

const EMPTY_MESSAGES: UIMessage[] = []
const EMPTY_GENERATION_STATS: Record<string, AssistantGenerationStats> = {}

/**
 * The chat panel's own subscriptions, deliberately narrow. Sidebar queries live
 * in useThreadList: sharing one hook meant a pinned/recent/running-run update
 * re-rendered the thread mid-stream for no visible reason.
 */
export function useActiveThread(
  threadId?: string,
  options: { forceGuestThread?: boolean } = {}
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const useBackend = isAuthenticated && !options.forceGuestThread
  const normalizedThreadId = threadId ?? null
  const hasActiveThreadId =
    normalizedThreadId != null && normalizedThreadId !== "guest"

  const threadDocument = useQuery(
    api.threads.get,
    useBackend && hasActiveThreadId ? { threadId: normalizedThreadId } : "skip"
  )
  const messageDocuments = useQuery(
    api.messages.listForThread,
    useBackend && hasActiveThreadId ? { threadId: normalizedThreadId } : "skip"
  )

  const projectionRef = useRef<MessageProjectionCache | null>(null)
  projectionRef.current ??= createMessageProjectionCache()
  const projection = projectionRef.current

  const messages = useMemo(
    () =>
      messageDocuments ? projection.messages(messageDocuments) : EMPTY_MESSAGES,
    [messageDocuments, projection]
  )
  const generationStats = useMemo(
    () =>
      messageDocuments
        ? projection.generationStats(messageDocuments)
        : EMPTY_GENERATION_STATS,
    [messageDocuments, projection]
  )

  const guestThread = useMemo(
    () => createPendingChatThread(normalizedThreadId ?? "guest"),
    [normalizedThreadId]
  )

  const activeThread = useMemo(() => {
    if (!useBackend || !hasActiveThreadId) return guestThread
    if (!threadDocument) return threadDocument
    // isStreaming belongs to the sidebar's running-run subscription; the panel
    // reads liveness from its own useChat instead.
    return toChatThread(threadDocument, messages, generationStats, false)
  }, [
    generationStats,
    guestThread,
    hasActiveThreadId,
    messages,
    threadDocument,
    useBackend,
  ])

  return {
    activeThread,
    canPersistThread: useBackend,
    isThreadDataReady: Boolean(
      !isAuthLoading &&
      (!useBackend ||
        !hasActiveThreadId ||
        (threadDocument !== undefined && messageDocuments !== undefined))
    ),
    messagesLoading: Boolean(
      useBackend && hasActiveThreadId && messageDocuments === undefined
    ),
  }
}
