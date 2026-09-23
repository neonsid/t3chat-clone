import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { useCallback, useLayoutEffect, useMemo, useRef } from "react"

import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { resolveThreadPanelView } from "@/components/chat/thread-panel-logic"
import { useActiveThread } from "@/hooks/useActiveThread"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { SIGN_IN_PATH } from "@/lib/auth"
import {
  createPendingChatThread,
  type ActiveChatThread,
  type ChatThread,
} from "@/lib/threads"
import { storedTemporaryThreadToChatThread } from "@/lib/temporary-chat"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { chatRuntimeStore } from "@/stores/chat-runtime-store"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import { useTemporaryThreadsStore } from "@/stores/temporary-threads-store"

export function ChatThreadPanel() {
  const navigate = useNavigate()
  const returnTo = useLocation({ select: (location) => location.href })
  const { isSignedIn, user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const isChatUiHydrated = useChatUiStore((state) => state.isHydrated)
  const isTemporaryThreadsHydrated = useTemporaryThreadsStore(
    (state) => state.isHydrated
  )
  const isTemporaryChatPreference = useChatUiStore(
    (state) => state.isTemporaryChat
  )
  const { isDraft, isTemporary, threadId } = useChatRouteState()
  const storedTemporaryThread = useTemporaryThreadsStore(
    (state) => state.threads[threadId]
  )
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
    !isDraft && !isTemporary && isThreadDataReady && activeThread === null
  )
  // Memoized so the placeholder's empty message list and stats keep their
  // identity; ChatThreadView memoizes rows against both.
  const pendingThread = useMemo(
    () => createPendingChatThread(threadId),
    [threadId]
  )
  const restoredTemporaryThread = useMemo(
    () =>
      storedTemporaryThread
        ? storedTemporaryThreadToChatThread(storedTemporaryThread, false)
        : null,
    [storedTemporaryThread]
  )
  let renderedThread: ChatThread | ActiveChatThread = pendingThread
  if (isTemporary && restoredTemporaryThread) {
    renderedThread = restoredTemporaryThread
  } else if (activeThread && !messagesLoading) {
    renderedThread = activeThread
  }
  const restoredStoppedMessageIds = useMemo(
    () =>
      storedTemporaryThread
        ? new Set(storedTemporaryThread.stoppedMessageIds)
        : null,
    [storedTemporaryThread]
  )
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

  const panelView = resolveThreadPanelView({
    isTemporary,
    isTemporaryThreadsHydrated,
    storedTemporaryThreadMissing: storedTemporaryThread == null,
    currentThreadHadPendingSubmission,
    activeThreadMissing,
    isDraft,
    isRouteDataReady,
    isChatUiHydrated,
    isChatDataReady,
    renderedThreadEmpty: renderedThread.messages.length === 0,
    isSignedIn,
    isAuthenticated,
    wasCurrentThreadReady,
  })

  if (panelView === "loading") return null
  if (panelView === "redirect") return <Navigate to="/" replace />

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
      webSearchSources={renderedThread.webSearchSources}
      webSearchQueries={renderedThread.webSearchQueries}
      thinkingSearchSplitAt={renderedThread.thinkingSearchSplitAt}
      stoppedMessageIds={
        isTemporary
          ? (restoredStoppedMessageIds ?? stoppedMessageIds)
          : stoppedMessageIds
      }
      isReady={isChatDataReady}
      isAuthenticated={isAuthenticated && canPersistThread}
      userName={userName}
      emptyStateIsTemporary={
        isTemporary || (isDraft && isTemporaryChatPreference)
      }
      onRequireAuthentication={requireAuthentication}
    />
  )
}
