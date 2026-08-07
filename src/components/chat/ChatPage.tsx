import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"
import { useRef } from "react"

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
  const returnTo = useLocation({ select: (location) => location.href })
  const { isSignedIn, user } = useUser()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
  const removeThreadState = useChatUiStore((state) => state.removeThreadState)
  const queuePendingSubmission = useChatUiStore(
    (state) => state.queuePendingSubmission
  )
  const hasPendingSubmission = useChatUiStore((state) =>
    Boolean(state.pendingSubmissions[threadId])
  )
  const isChatUiHydrated = useChatUiStore((state) => state.isHydrated)
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

  // Both latches guard against `isChatDataReady` dipping (an auth token
  // refresh re-resolves the Convex queries). Without them the thread view
  // unmounts mid-turn and remounts, replaying the first-turn handoff, and the
  // consumed submission would momentarily look like a dead empty thread.
  const wasChatDataReadyRef = useRef(false)
  if (isChatDataReady) wasChatDataReadyRef.current = true
  const hadPendingSubmissionRef = useRef(false)
  if (hasPendingSubmission) hadPendingSubmissionRef.current = true

  if (isRouteDataReady && isThreadDataReady && activeThread === null) {
    return <Navigate to="/" replace />
  }

  if (
    isRouteDataReady &&
    !isDraft &&
    isChatUiHydrated &&
    isThreadDataReady &&
    activeThread != null &&
    activeThread.messages.length === 0 &&
    !hadPendingSubmissionRef.current
  ) {
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

  function createNewThread() {
    void navigate({ to: "/" })
  }

  function requireAuthentication() {
    if (isSignedIn) return
    void navigate({
      to: SIGN_IN_PATH,
      search: { redirect_url: returnTo },
    })
  }

  function activateDraftWithMessage(content: string) {
    if (!isDraft || !canPersistThread) return
    queuePendingSubmission(activeThreadId, content)
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: activeThreadId },
      replace: true,
    })
  }

  const userName =
    user?.firstName ?? user?.fullName ?? user?.username ?? "there"

  async function navigateAfterLeavingThread(nextThreadId: string) {
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
  }

  async function removeThread(removedThreadId: string) {
    const nextThreadId = await deleteThread(removedThreadId)
    removeThreadState(createThreadStateKey(user?.id, removedThreadId))
    if (removedThreadId !== activeThreadId) return

    await navigateAfterLeavingThread(nextThreadId)
  }

  async function archiveChat(archivedThreadId: string) {
    const nextThreadId = await archiveThread(archivedThreadId)
    if (archivedThreadId !== activeThreadId) return

    await navigateAfterLeavingThread(nextThreadId)
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
            create: createNewThread,
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
            {isDraft || isChatDataReady || wasChatDataReadyRef.current ? (
              <ChatThreadView
                key={
                  isDraft
                    ? `${renderedThread.id}:${isChatDataReady ? "ready" : "pending"}`
                    : renderedThread.id
                }
                threadId={renderedThread.id}
                threadStateKey={threadStateKey}
                initialMessages={renderedThread.messages}
                generationStats={renderedThread.generationStats}
                onCreateThread={createNewThread}
                isReady={isChatDataReady}
                isAuthenticated={isAuthenticated && canPersistThread}
                userName={userName}
                onRequireAuthentication={requireAuthentication}
                onDraftSubmit={isDraft ? activateDraftWithMessage : undefined}
              />
            ) : null}
          </SidebarInset>
        </ChatShell>
      </AppSidebarProvider>
    </LazyMotion>
  )
}
