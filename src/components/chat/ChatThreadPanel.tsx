import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"

import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { useActiveThread } from "@/hooks/useActiveThread"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { SIGN_IN_PATH } from "@/lib/auth"
import { createPendingChatThread } from "@/lib/threads"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { chatRuntimeStore } from "@/stores/chat-runtime-store"
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
    stoppedMessageIds,
    isThreadDataReady,
    canPersistThread,
    messagesLoading,
  } = useActiveThread(threadId, { forceGuestThread })

  const isChatDataReady = isRouteDataReady && isThreadDataReady
  const activeThreadMissing = Boolean(
    !isDraft && isThreadDataReady && activeThread === null
  )
  // Memoized so the placeholder's empty message list and stats keep their
  // identity; ChatThreadView memoizes rows against both.
  const pendingThread = useMemo(
    () => createPendingChatThread(threadId),
    [threadId]
  )
  const renderedThread =
    activeThread && !messagesLoading ? activeThread : pendingThread
  const hasPendingSubmission = useChatUiStore((state) =>
    Boolean(state.pendingSubmissions[threadId])
  )

  // Sticky latches: once this thread was ready / had a pending submit, keep the
  // panel mounted across transient unreadiness (draft handoff). Render-time
  // ref read is intentional — effect-sync would blank or false-redirect.
  const readyThreadIdRef = useRef<string | null>(null)
  if (isChatDataReady) readyThreadIdRef.current = threadId
  const wasCurrentThreadReady = readyThreadIdRef.current === threadId

  const pendingThreadIdRef = useRef<string | null>(null)
  if (hasPendingSubmission) pendingThreadIdRef.current = threadId
  const currentThreadHadPendingSubmission =
    pendingThreadIdRef.current === threadId

  useLayoutEffect(() => {
    chatRuntimeStore.getState().setPanelState({ messagesLoading })
  }, [messagesLoading])

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
      stoppedMessageIds={stoppedMessageIds}
      isReady={isChatDataReady}
      isAuthenticated={isAuthenticated && canPersistThread}
      userName={userName}
      onRequireAuthentication={requireAuthentication}
    />
  )
}
