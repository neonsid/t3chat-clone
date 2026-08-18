import { useMemo, useRef } from "react"
import { useConvexAuth, useQuery } from "convex/react"
import type { UIMessage } from "@tanstack/ai-react"

import { api } from "../../convex/_generated/api"
import { isTemporaryThreadId } from "@/lib/temporary-chat"
import {
  createMessageProjectionCache,
  createPendingChatThread,
  toActiveChatThread,
} from "@/lib/threads"
import type {
  AssistantGenerationStats,
  MessageProjectionCache,
} from "@/lib/threads"

const EMPTY_MESSAGES: UIMessage[] = []
const EMPTY_GENERATION_STATS: Record<string, AssistantGenerationStats> = {}
const EMPTY_STOPPED_MESSAGE_IDS: ReadonlySet<string> = new Set()

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
    normalizedThreadId != null &&
    normalizedThreadId !== "guest" &&
    !isTemporaryThreadId(normalizedThreadId)

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
  // Kept beside the thread rather than on it: a stopped turn is a property of
  // the run, and the panel needs it for messages it is rendering from useChat
  // rather than from this query.
  const stoppedMessageIds = useMemo(
    () =>
      messageDocuments
        ? projection.stoppedMessageIds(messageDocuments)
        : EMPTY_STOPPED_MESSAGE_IDS,
    [messageDocuments, projection]
  )

  const guestThread = useMemo(
    () => createPendingChatThread(normalizedThreadId ?? "guest"),
    [normalizedThreadId]
  )

  const activeThread = useMemo(() => {
    if (!useBackend || !hasActiveThreadId) return guestThread
    if (!threadDocument) return threadDocument
    return toActiveChatThread(threadDocument, messages, generationStats)
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
    stoppedMessageIds,
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
