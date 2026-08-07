import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex, useMutation } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"

import { api } from "../../../convex/_generated/api"
import {
  ChatHeaderActions,
  ChatShell,
} from "@/components/chat/shell/ChatShellChrome"
import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { SidebarInset } from "@/components/shared/ui/sidebar"
import { useThreads } from "@/hooks/useThreads"
import { SIGN_IN_PATH } from "@/lib/auth"
import { createPendingChatThread } from "@/lib/threads"
import { useChatUiStore, useSidebarUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"

export function ChatPage({
  threadId,
  isDraft = false,
  forceGuestThread = false,
  isRouteDataReady = true,
}: {
  threadId: string
  isDraft?: boolean
  forceGuestThread?: boolean
  isRouteDataReady?: boolean
}) {
  const navigate = useNavigate()
  const convex = useConvex()
  const createThread = useMutation(api.threads.createOrReuseEmpty)
  const returnTo = useLocation({ select: (location) => location.href })
  const { isSignedIn, user } = useUser()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
  const removeThreadState = useChatUiStore((state) => state.removeThreadState)
  const {
    activeThread,
    isAuthenticated,
    isAuthLoading,
    isThreadDataReady,
    isSidebarDataReady,
    canPersistThread,
    messagesLoading,
    threads,
    paginationStatus,
    loadMore,
    deleteThread,
    toggleThreadPinned,
    archiveThread,
    renameThread,
    regenerateThreadTitle,
  } = useThreads(threadId, { forceGuestThread, searchQuery })
  const isChatDataReady = isRouteDataReady && isThreadDataReady
  const renderedThread =
    activeThread && !messagesLoading
      ? activeThread
      : createPendingChatThread(threadId)

  if (isRouteDataReady && isThreadDataReady && activeThread === null) {
    return <Navigate to="/" replace />
  }

  if (
    isRouteDataReady &&
    !isDraft &&
    isSignedIn &&
    !isAuthLoading &&
    !isAuthenticated
  ) {
    return <Navigate to="/" replace />
  }

  if (isChatDataReady && renderedThread.id !== threadId) {
    return (
      <Navigate
        to="/chat/$threadId"
        params={{ threadId: renderedThread.id }}
        replace
      />
    )
  }
  const activeThreadId = renderedThread.id
  const threadStateKey = createThreadStateKey(user?.id, activeThreadId)

  function openThread(nextThreadId: string) {
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThreadId },
    })
  }

  async function createNewThread() {
    if (!canPersistThread) {
      await navigate({ to: "/" })
      return
    }

    const nextThreadId = await createThread({})
    await Promise.all([
      convex.query(api.threads.get, { threadId: nextThreadId }),
      convex.query(api.messages.listForThread, { threadId: nextThreadId }),
    ])
    await navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThreadId },
    })
  }

  function requireAuthentication() {
    if (isSignedIn) return
    void navigate({
      to: SIGN_IN_PATH,
      search: { redirect_url: returnTo },
    })
  }

  const userName =
    user?.firstName ?? user?.fullName ?? user?.username ?? "there"

  function activateDraftThread() {
    if (!isDraft || !canPersistThread) return
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: activeThreadId },
      replace: true,
    })
  }

  async function removeThread(removedThreadId: string) {
    const nextThreadId = await deleteThread(removedThreadId)
    removeThreadState(createThreadStateKey(user?.id, removedThreadId))
    if (removedThreadId !== activeThreadId) return

    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThreadId },
      replace: true,
    })
  }

  async function archiveChat(archivedThreadId: string) {
    const nextThreadId = await archiveThread(archivedThreadId)
    if (archivedThreadId !== activeThreadId) return

    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThreadId },
      replace: true,
    })
  }

  return (
    <LazyMotion features={domAnimation}>
      <AppSidebarProvider className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={renderedThread.id}
          isDataReady={isRouteDataReady && isSidebarDataReady}
          paginationStatus={paginationStatus}
          onLoadMore={loadMore}
          actions={{
            select: openThread,
            create: () => void createNewThread(),
            delete: (id) => void removeThread(id),
            togglePinned: (id) => void toggleThreadPinned(id),
            archive: (id) => void archiveChat(id),
            rename: (id, title) => void renameThread(id, title),
            regenerateTitle: (id) => void regenerateThreadTitle(id),
          }}
        />
        <ChatHeaderActions />
        <ChatShell>
          <SidebarInset className="h-full min-h-0 overflow-hidden bg-background">
            <ChatThreadView
              key={`${renderedThread.id}:${isChatDataReady ? "ready" : "pending"}`}
              threadId={renderedThread.id}
              threadStateKey={threadStateKey}
              initialMessages={renderedThread.messages}
              generationStats={renderedThread.generationStats}
              onCreateThread={() => void createNewThread()}
              isReady={isChatDataReady}
              isAuthenticated={isAuthenticated && canPersistThread}
              userName={userName}
              onRequireAuthentication={requireAuthentication}
              onThreadStarted={isDraft ? activateDraftThread : undefined}
            />
          </SidebarInset>
        </ChatShell>
      </AppSidebarProvider>
    </LazyMotion>
  )
}
