import { useCallback, useMemo } from "react"
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react"

import { api } from "../../convex/_generated/api"
import { asThreadId } from "@/lib/convex-ids"
import { toChatThread } from "@/lib/threads"

const THREAD_PAGE_SIZE = 20

/**
 * Sidebar-only data. Keep the active thread's subscriptions out of here (see
 * useActiveThread): a hook shared with the panel makes every thread-list update
 * re-render the open conversation.
 */
export function useThreadList(
  options: { forceGuestThread?: boolean; searchQuery?: string } = {}
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const useBackend = isAuthenticated && !options.forceGuestThread
  const query = options.searchQuery ?? ""

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
  const runningThreadIds = useQuery(
    api.chatRuns.listRunningThreadIds,
    useBackend ? {} : "skip"
  )

  const deleteThreadMutation = useMutation(api.threads.remove)
  const archiveThreadMutation = useMutation(api.threads.archive)
  const setPinnedMutation = useMutation(api.threads.setPinned)
  const renameThreadMutation = useMutation(api.threads.rename)
  const regenerateTitleMutation = useMutation(api.threads.regenerateTitle)

  const runningThreadIdSet = useMemo(
    () => new Set(runningThreadIds ?? []),
    [runningThreadIds]
  )

  const threads = useMemo(() => {
    if (!useBackend) return []
    if (query.trim())
      return (searchDocuments ?? []).map((thread) =>
        toChatThread(thread, [], {}, runningThreadIdSet.has(thread._id))
      )

    const seen = new Set<string>()
    return [...(pinnedDocuments ?? []), ...recent.results].flatMap((thread) => {
      if (seen.has(thread._id)) return []
      seen.add(thread._id)
      return [toChatThread(thread, [], {}, runningThreadIdSet.has(thread._id))]
    })
  }, [
    pinnedDocuments,
    query,
    recent.results,
    runningThreadIdSet,
    searchDocuments,
    useBackend,
  ])

  const isSidebarDataReady = Boolean(
    !isAuthLoading &&
    (!useBackend ||
      (pinnedDocuments !== undefined && recent.status !== "LoadingFirstPage"))
  )

  const requireThreadId = useCallback((threadId: string) => {
    return asThreadId(threadId)
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
    isAuthenticated,
    isAuthLoading,
    isSidebarDataReady,
    canPersistThread: useBackend,
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
