import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { useCallback, useRef } from "react"

import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useThreads } from "@/hooks/useThreads"
import { SIGN_IN_PATH } from "@/lib/auth"
import { createPendingChatThread } from "@/lib/threads"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"

export function ChatThreadPanel() {
  const navigate = useNavigate()
  const returnTo = useLocation({ select: (location) => location.href })
  const { isSignedIn, user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const isChatUiHydrated = useChatUiStore((state) => state.isHydrated)
  const { isDraft, threadId } = useChatRouteState()
  const forceGuestThread = isAuthLoading || !isAuthenticated
  const isRouteDataReady = !isAuthLoading

  const {
    activeThread,
    isThreadDataReady,
    canPersistThread,
    messagesLoading,
  } = useThreads(threadId, { forceGuestThread })

  const isChatDataReady = isRouteDataReady && isThreadDataReady
  const activeThreadMissing = Boolean(
    !isDraft && isThreadDataReady && activeThread === null
  )
  const renderedThread =
    activeThread && !messagesLoading
      ? activeThread
      : createPendingChatThread(threadId)
  const hasPendingSubmission = useChatUiStore((state) =>
    Boolean(state.pendingSubmissions[threadId])
  )

  const readyThreadIdRef = useRef<string | null>(null)
  if (isChatDataReady) readyThreadIdRef.current = threadId
  const wasCurrentThreadReady = readyThreadIdRef.current === threadId

  const pendingThreadIdRef = useRef<string | null>(null)
  if (hasPendingSubmission) pendingThreadIdRef.current = threadId
  const currentThreadHadPendingSubmission =
    pendingThreadIdRef.current === threadId

  const requireAuthentication = useCallback(() => {
    if (isSignedIn) return
    void navigate({
      to: SIGN_IN_PATH,
      search: { redirect_url: returnTo },
    })
  }, [isSignedIn, navigate, returnTo])

  if (activeThreadMissing) {
    return <Navigate to="/" replace />
  }

  if (
    !isDraft &&
    isRouteDataReady &&
    isChatUiHydrated &&
    isChatDataReady &&
    renderedThread.messages.length === 0 &&
    !currentThreadHadPendingSubmission
  ) {
    return <Navigate to="/" replace />
  }

  if (!isDraft && isRouteDataReady && isSignedIn && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // A thread reached through the draft handoff is known to be empty, because
  // createOrReuseEmpty only ever returns a thread without messages. Waiting on
  // its Convex subscriptions would drop the surface for a round trip in the
  // middle of the navigation, blanking the optimistic bubble the draft route was
  // already painting.
  if (
    !(
      isDraft ||
      isChatDataReady ||
      wasCurrentThreadReady ||
      currentThreadHadPendingSubmission
    )
  ) {
    return null
  }

  const threadStateKey = createThreadStateKey(user?.id, renderedThread.id)
  const userName =
    user?.firstName ?? user?.fullName ?? user?.username ?? "there"

  return (
    <ChatThreadView
      key={renderedThread.id}
      threadId={renderedThread.id}
      threadStateKey={threadStateKey}
      initialMessages={renderedThread.messages}
      generationStats={renderedThread.generationStats}
      isReady={isChatDataReady}
      isAuthenticated={isAuthenticated && canPersistThread}
      userName={userName}
      onRequireAuthentication={requireAuthentication}
    />
  )
}
