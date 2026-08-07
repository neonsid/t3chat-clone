import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { LazyMotion, domAnimation } from "motion/react"

import {
  ChatHeaderActions,
  ChatShell,
} from "@/components/chat/shell/ChatShellChrome"
import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/shared/ui/sidebar"
import { useThreads } from "@/hooks/useThreads"
import { SIGN_IN_PATH } from "@/lib/auth"

export function ChatPage({
  threadId,
  isDraft = false,
  forceGuestThread = false,
}: {
  threadId: string
  isDraft?: boolean
  forceGuestThread?: boolean
}) {
  const navigate = useNavigate()
  const returnTo = useLocation({ select: (location) => location.href })
  const { isSignedIn, user } = useUser()
  const {
    activeThread,
    isAuthenticated,
    isAuthLoading,
    isThreadReady,
    messagesLoading,
    threads,
    query,
    setQuery,
    paginationStatus,
    loadMore,
    deleteThread,
    toggleThreadPinned,
    archiveThread,
    renameThread,
    regenerateThreadTitle,
  } = useThreads(threadId, { forceGuestThread })

  if (activeThread === undefined || messagesLoading) {
    return <div className="h-dvh bg-background" />
  }

  if (activeThread === null) {
    return <Navigate to="/" replace />
  }

  if (!isDraft && isSignedIn && !isAuthLoading && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!isDraft && isAuthenticated && activeThread.messages.length === 0) {
    return <Navigate to="/" replace />
  }

  if (activeThread.id !== threadId) {
    return (
      <Navigate
        to="/chat/$threadId"
        params={{ threadId: activeThread.id }}
        replace
      />
    )
  }
  const activeThreadId = activeThread.id

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

  const userName =
    user?.firstName ?? user?.fullName ?? user?.username ?? "there"

  function activateDraftThread() {
    if (!isDraft || !isThreadReady) return
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: activeThreadId },
      replace: true,
    })
  }

  async function removeThread(removedThreadId: string) {
    const nextThreadId = await deleteThread(removedThreadId)
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
      <SidebarProvider defaultOpen className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          query={query}
          onQueryChange={setQuery}
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
              key={activeThread.id}
              threadId={activeThread.id}
              initialMessages={activeThread.messages}
              generationStats={activeThread.generationStats}
              onCreateThread={() => void createNewThread()}
              isAuthenticated={isAuthenticated && isThreadReady}
              userName={userName}
              onRequireAuthentication={requireAuthentication}
              onThreadStarted={isDraft ? activateDraftThread : undefined}
            />
          </SidebarInset>
        </ChatShell>
      </SidebarProvider>
    </LazyMotion>
  )
}
