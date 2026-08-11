import { useUser } from "@clerk/tanstack-react-start"
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex, useConvexAuth } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"
import { useCallback, useMemo } from "react"

import { api } from "../../../convex/_generated/api"
import { ChatShellComposer } from "@/components/chat/ChatShellComposer"
import {
  ChatHeaderActions,
  ChatShell,
  SidebarControl,
} from "@/components/chat/shell/ChatShellChrome"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { SidebarInset } from "@/components/shared/ui/sidebar"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useThreadList } from "@/hooks/useThreadList"
import { SIGN_IN_PATH } from "@/lib/auth"
import { useChatUiStore, useSidebarUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import {
  chatRuntimeStore,
  useChatRuntimeStore,
} from "@/stores/chat-runtime-store"

export function ChatShellLayout() {
  const navigate = useNavigate()
  const convex = useConvex()
  const returnTo = useLocation({ select: (location) => location.href })
  const { user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
  const removeThreadState = useChatUiStore((state) => state.removeThreadState)
  const queuePendingSubmission = useChatUiStore(
    (state) => state.queuePendingSubmission
  )
  const takePendingSubmission = useChatUiStore(
    (state) => state.takePendingSubmission
  )
  const moveThreadState = useChatUiStore((state) => state.moveThreadState)
  const { isDraft, threadId } = useChatRouteState()
  const forceGuestThread = isAuthLoading || !isAuthenticated
  const isRouteDataReady = !isAuthLoading
  const threadStateKey = createThreadStateKey(user?.id, threadId)
  // Highlight only: the shell never subscribes to the active thread, or every
  // message update would re-render the sidebar and chrome.
  const sidebarActiveThreadId = isDraft ? "guest" : threadId
  const hasConversation = useChatRuntimeStore((state) => !state.isEmptyThread)

  const {
    isSidebarDataReady,
    canPersistThread,
    threads,
    paginationStatus,
    loadMore,
    deleteThread,
    toggleThreadPinned,
    archiveThread,
    renameThread,
    regenerateThreadTitle,
  } = useThreadList({ forceGuestThread, searchQuery })

  const openThread = useCallback(
    (nextThreadId: string) => {
      void navigate({
        to: "/chat/$threadId",
        params: { threadId: nextThreadId },
      })
    },
    [navigate]
  )

  const createNewThread = useCallback(() => {
    void navigate({ to: "/" })
  }, [navigate])

  const requireAuthentication = useCallback(() => {
    void navigate({
      to: SIGN_IN_PATH,
      search: { redirect_url: returnTo },
    })
  }, [navigate, returnTo])

  const activateDraftWithMessage = useCallback(
    (content: string) => {
      if (!isDraft || !canPersistThread) return

      void (async () => {
        let createdThreadId: string | null = null
        try {
          createdThreadId = await convex.mutation(
            api.threads.createOrReuseEmpty,
            {}
          )
          moveThreadState(
            createThreadStateKey(user?.id, "guest"),
            createThreadStateKey(user?.id, createdThreadId)
          )
          queuePendingSubmission(createdThreadId, content)
          await navigate({
            to: "/chat/$threadId",
            params: { threadId: createdThreadId },
            replace: true,
          })
          // Ask the mounted thread view to dispatch the queued first turn once
          // its useChat client is bound — not from a mount effect.
          chatRuntimeStore.getState().requestPendingFlush(createdThreadId)
        } catch (submissionError) {
          if (createdThreadId) takePendingSubmission(createdThreadId)
          // The turn never reached a stream, so release the bridged "sending"
          // state; the thread view can't clear it without a successful handoff.
          chatRuntimeStore.getState().setActiveTurn(false)
          throw submissionError
        }
      })()
    },
    [
      canPersistThread,
      convex,
      isDraft,
      moveThreadState,
      navigate,
      queuePendingSubmission,
      takePendingSubmission,
      user?.id,
    ]
  )

  const navigateAfterLeavingThread = useCallback(
    async (nextThreadId: string) => {
      const nextThread = await convex.query(api.threads.get, {
        threadId: nextThreadId,
      })
      if (!nextThread?.hasMessages) {
        await navigate({ to: "/", replace: true })
        return
      }

      await navigate({
        to: "/chat/$threadId",
        params: { threadId: nextThreadId },
        replace: true,
      })
    },
    [convex, navigate]
  )

  const removeThread = useCallback(
    async (removedThreadId: string) => {
      const nextThreadId = await deleteThread(removedThreadId)
      removeThreadState(createThreadStateKey(user?.id, removedThreadId))
      if (removedThreadId !== sidebarActiveThreadId) return

      await navigateAfterLeavingThread(nextThreadId)
    },
    [
      deleteThread,
      navigateAfterLeavingThread,
      removeThreadState,
      sidebarActiveThreadId,
      user?.id,
    ]
  )

  const archiveChat = useCallback(
    async (archivedThreadId: string) => {
      const nextThreadId = await archiveThread(archivedThreadId)
      if (archivedThreadId !== sidebarActiveThreadId) return

      await navigateAfterLeavingThread(nextThreadId)
    },
    [archiveThread, navigateAfterLeavingThread, sidebarActiveThreadId]
  )

  const sidebarActions = useMemo(
    () => ({
      select: openThread,
      create: createNewThread,
      delete: (id: string) => void removeThread(id),
      togglePinned: (id: string) => void toggleThreadPinned(id),
      archive: (id: string) => void archiveChat(id),
      rename: (id: string, title: string) => void renameThread(id, title),
      regenerateTitle: (id: string) => void regenerateThreadTitle(id),
    }),
    [
      archiveChat,
      createNewThread,
      openThread,
      regenerateThreadTitle,
      removeThread,
      renameThread,
      toggleThreadPinned,
    ]
  )

  return (
    <LazyMotion features={domAnimation}>
      <AppSidebarProvider className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={sidebarActiveThreadId}
          isDataReady={isRouteDataReady && isSidebarDataReady}
          paginationStatus={paginationStatus}
          onLoadMore={loadMore}
          actions={sidebarActions}
        />
        <SidebarControl
          hasConversation={hasConversation}
          onCreateThread={createNewThread}
        />
        <ChatHeaderActions />
        <ChatShell>
          <SidebarInset className="relative h-full min-h-0 overflow-hidden bg-background">
            <Outlet />
            <ChatShellComposer
              threadStateKey={threadStateKey}
              isDraft={isDraft}
              isAuthenticated={isAuthenticated && canPersistThread}
              canSubmit={isRouteDataReady && canPersistThread}
              onDraftSubmit={activateDraftWithMessage}
              onRequireAuthentication={requireAuthentication}
            />
          </SidebarInset>
        </ChatShell>
      </AppSidebarProvider>
    </LazyMotion>
  )
}
