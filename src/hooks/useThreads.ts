import { useCallback, useMemo } from "react"
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { toChatMessages, toChatThread, toGenerationStats } from "@/lib/threads"

const THREAD_PAGE_SIZE = 20

export function useThreads(
  initialThreadId?: string,
  options: { forceGuestThread?: boolean; searchQuery?: string } = {}
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const useBackend = isAuthenticated && !options.forceGuestThread
  const query = options.searchQuery ?? ""
  const normalizedThreadId = initialThreadId ?? null
  const hasActiveThreadId =
    normalizedThreadId != null && normalizedThreadId !== "guest"
  const activeThreadDocument = useQuery(
    api.threads.get,
    useBackend && hasActiveThreadId ? { threadId: normalizedThreadId } : "skip"
  )
  const messageDocuments = useQuery(
    api.messages.listForThread,
    useBackend && hasActiveThreadId ? { threadId: normalizedThreadId } : "skip"
  )
  const pinnedDocuments = useQuery(
    api.threads.listPinned,
    useBackend ? {} : "skip"
  )
  const searchDocuments = useQuery(
    api.threads.search,
    useBackend && query.trim() ? { search: query } : "skip"
  )
  const recent = usePaginatedQuery(
    api.threads.listRecent,
    useBackend ? {} : "skip",
    { initialNumItems: THREAD_PAGE_SIZE }
  )

  const deleteThreadMutation = useMutation(api.threads.remove)
  const archiveThreadMutation = useMutation(api.threads.archive)
  const setPinnedMutation = useMutation(api.threads.setPinned)
  const renameThreadMutation = useMutation(api.threads.rename)
  const regenerateTitleMutation = useMutation(api.threads.regenerateTitle)

  const activeMessages = useMemo(
    () => (messageDocuments ? toChatMessages(messageDocuments) : []),
    [messageDocuments]
  )
  const generationStats = useMemo(
    () => (messageDocuments ? toGenerationStats(messageDocuments) : {}),
    [messageDocuments]
  )
  const guestThread = useMemo(
    () => ({
      id: normalizedThreadId ?? "guest",
      title: "New Chat",
      createdAt: 0,
      updatedAt: 0,
      messages: [],
      generationStats: {},
    }),
    [normalizedThreadId]
  )
  const activeThread = !useBackend
    ? guestThread
    : !hasActiveThreadId
      ? guestThread
      : activeThreadDocument
        ? toChatThread(activeThreadDocument, activeMessages, generationStats)
        : activeThreadDocument

  const threads = useMemo(() => {
    if (!useBackend) return []
    if (query.trim())
      return (searchDocuments ?? []).map((thread) => toChatThread(thread))

    const seen = new Set<string>()
    return [...(pinnedDocuments ?? []), ...recent.results].flatMap((thread) => {
      if (seen.has(thread._id)) return []
      seen.add(thread._id)
      return [toChatThread(thread)]
    })
  }, [pinnedDocuments, query, recent.results, searchDocuments, useBackend])
  const isThreadDataReady = Boolean(
    !isAuthLoading &&
    (!useBackend ||
      !hasActiveThreadId ||
      (activeThreadDocument !== undefined &&
        messageDocuments !== undefined))
  )
  const isSidebarDataReady = Boolean(
    !isAuthLoading &&
    (!useBackend ||
      (pinnedDocuments !== undefined && recent.status !== "LoadingFirstPage"))
  )

  const requireThreadId = useCallback((threadId: string): Id<"threads"> => {
    return threadId as Id<"threads">
  }, [])

  const requireAuthentication = useCallback(() => {
    if (!isAuthenticated) throw new Error("Authentication required")
  }, [isAuthenticated])

  const loadMore = useCallback(() => {
    if (useBackend) recent.loadMore(THREAD_PAGE_SIZE)
  }, [recent, useBackend])

  const deleteThread = useCallback(
    async (threadId: string) => {
      requireAuthentication()
      return await deleteThreadMutation({
        threadId: requireThreadId(threadId),
      })
    },
    [deleteThreadMutation, requireAuthentication, requireThreadId]
  )

  const archiveThread = useCallback(
    async (threadId: string) => {
      requireAuthentication()
      return await archiveThreadMutation({
        threadId: requireThreadId(threadId),
      })
    },
    [archiveThreadMutation, requireAuthentication, requireThreadId]
  )

  const toggleThreadPinned = useCallback(
    async (threadId: string) => {
      requireAuthentication()
      const thread = threads.find((item) => item.id === threadId)
      await setPinnedMutation({
        threadId: requireThreadId(threadId),
        pinned: !thread?.pinnedAt,
      })
    },
    [requireAuthentication, requireThreadId, setPinnedMutation, threads]
  )

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      requireAuthentication()
      return await renameThreadMutation({
        threadId: requireThreadId(threadId),
        title,
      })
    },
    [renameThreadMutation, requireAuthentication, requireThreadId]
  )

  const regenerateThreadTitle = useCallback(
    async (threadId: string) => {
      requireAuthentication()
      return await regenerateTitleMutation({
        threadId: requireThreadId(threadId),
      })
    },
    [regenerateTitleMutation, requireAuthentication, requireThreadId]
  )

  return {
    activeThread,
    isAuthenticated,
    isAuthLoading,
    isThreadDataReady,
    isSidebarDataReady,
    canPersistThread: useBackend,
    messagesLoading: Boolean(
      useBackend && hasActiveThreadId && messageDocuments === undefined
    ),
    threads,
    paginationStatus: !useBackend || query.trim() ? "Exhausted" : recent.status,
    loadMore,
    deleteThread,
    archiveThread,
    toggleThreadPinned,
    renameThread,
    regenerateThreadTitle,
  }
}
