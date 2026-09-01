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
import type { WebSearchSource } from "@/lib/web-search"

const EMPTY_MESSAGES: UIMessage[] = []
const EMPTY_GENERATION_STATS: Record<string, AssistantGenerationStats> = {}
const EMPTY_WEB_SEARCH_SOURCES: Record<string, WebSearchSource[]> = {}
const EMPTY_WEB_SEARCH_QUERIES: Record<string, string[]> = {}
const EMPTY_THINKING_SEARCH_SPLIT_AT: Record<string, number> = {}
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
  const webSearchSources = useMemo(
    () =>
      messageDocuments
        ? projection.webSearchSources(messageDocuments)
        : EMPTY_WEB_SEARCH_SOURCES,
    [messageDocuments, projection]
  )
  const webSearchQueries = useMemo(
    () =>
      messageDocuments
        ? projection.webSearchQueries(messageDocuments)
        : EMPTY_WEB_SEARCH_QUERIES,
    [messageDocuments, projection]
  )
  const thinkingSearchSplitAt = useMemo(
    () =>
      messageDocuments
        ? projection.thinkingSearchSplitAt(messageDocuments)
        : EMPTY_THINKING_SEARCH_SPLIT_AT,
    [messageDocuments, projection]
  )
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
    return toActiveChatThread(
      threadDocument,
      messages,
      generationStats,
      webSearchSources,
      webSearchQueries,
      thinkingSearchSplitAt
    )
  }, [
    generationStats,
    guestThread,
    hasActiveThreadId,
    messages,
    thinkingSearchSplitAt,
    threadDocument,
    useBackend,
    webSearchQueries,
    webSearchSources,
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
