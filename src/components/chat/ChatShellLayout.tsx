import { useUser } from "@clerk/tanstack-react-start"
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex, useConvexAuth, useMutation } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"
import { useCallback, useLayoutEffect, useMemo, useState } from "react"

import { api } from "../../../convex/_generated/api"
import { ChatShellComposer } from "@/components/chat/ChatShellComposer"
import {
  ChatHeaderActions,
  ChatShell,
  SidebarControl,
} from "@/components/chat/shell/ChatShellChrome"
import { ConvertTemporaryChatDialog } from "@/components/chat/temporary-chat/ConvertTemporaryChatDialog"
import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/shared/motion/animated-toast-stack"
import { SidebarInset } from "@/components/shared/ui/sidebar"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useThreadList } from "@/hooks/useThreadList"
import { SIGN_IN_PATH } from "@/lib/auth"
import {
  createTemporarySidebarThread,
  createTemporaryThreadId,
} from "@/lib/temporary-chat"
import { useChatUiStore, useSidebarUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import {
  chatRuntimeStore,
  useChatRuntimeStore,
} from "@/stores/chat-runtime-store"

export function ChatShellLayout() {
  const navigate = useNavigate()
  const convex = useConvex()
  const persistTemporary = useMutation(api.threads.persistTemporary)
  const returnTo = useLocation({ select: (location) => location.href })
  const { user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
  const isChatUiHydrated = useChatUiStore((state) => state.isHydrated)
  const isTemporaryChatPreference = useChatUiStore(
    (state) => state.isTemporaryChat
  )
  const setTemporaryChat = useChatUiStore((state) => state.setTemporaryChat)
  const removeThreadState = useChatUiStore((state) => state.removeThreadState)
  const queuePendingSubmission = useChatUiStore(
    (state) => state.queuePendingSubmission
  )
  const takePendingSubmission = useChatUiStore(
    (state) => state.takePendingSubmission
  )
  const moveThreadState = useChatUiStore((state) => state.moveThreadState)
  const { isDraft, isTemporary, threadId } = useChatRouteState()
  const forceGuestThread = isAuthLoading || !isAuthenticated
  const isRouteDataReady = !isAuthLoading
  const threadStateKey = createThreadStateKey(user?.id, threadId)
  const sidebarActiveThreadId = isDraft ? "guest" : threadId
  const hasConversation = useChatRuntimeStore((state) => !state.isEmptyThread)
  const isBusy = useChatRuntimeStore(
    (state) => state.isLoading || state.activeTurn
  )
  const toasts = useAnimatedToastStack({ limit: 1 })
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertPending, setConvertPending] = useState(false)

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

  const sidebarThreads = useMemo(() => {
    if (!isTemporary) return threads
    return [createTemporarySidebarThread(threadId, isBusy), ...threads]
  }, [isBusy, isTemporary, threadId, threads])

  useLayoutEffect(() => {
    if (!isChatUiHydrated) return
    if (!isTemporaryChatPreference || !isDraft) return
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: createTemporaryThreadId() },
      replace: true,
    })
  }, [isChatUiHydrated, isDraft, isTemporaryChatPreference, navigate])

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
    if (isTemporaryChatPreference) {
      void navigate({
        to: "/chat/$threadId",
        params: { threadId: createTemporaryThreadId() },
      })
      return
    }
    void navigate({ to: "/" })
  }, [isTemporaryChatPreference, navigate])

  const requireAuthentication = useCallback(() => {
    void navigate({
      to: SIGN_IN_PATH,
      search: { redirect_url: returnTo },
    })
  }, [navigate, returnTo])

  const activateDraftWithMessage = useCallback(
    (content: string, attachmentIds: string[] = []) => {
      if (!isDraft) return

      if (isTemporaryChatPreference) {
        void (async () => {
          const createdThreadId = createTemporaryThreadId()
          try {
            moveThreadState(
              createThreadStateKey(user?.id, "guest"),
              createThreadStateKey(user?.id, createdThreadId)
            )
            queuePendingSubmission(createdThreadId, content, attachmentIds)
            await navigate({
              to: "/chat/$threadId",
              params: { threadId: createdThreadId },
              replace: true,
            })
            chatRuntimeStore.getState().requestPendingFlush(createdThreadId)
          } catch (submissionError) {
            takePendingSubmission(createdThreadId)
            chatRuntimeStore.getState().setActiveTurn(false)
            throw submissionError
          }
        })()
        return
      }

      if (!canPersistThread) return

      void (async () => {
        let createdThreadId: string | null = null
        try {
          const createdId = await convex.mutation(
            api.threads.createOrReuseEmpty,
            {}
          )
          createdThreadId = createdId
          moveThreadState(
            createThreadStateKey(user?.id, "guest"),
            createThreadStateKey(user?.id, createdId)
          )
          queuePendingSubmission(createdId, content, attachmentIds)
          await navigate({
            to: "/chat/$threadId",
            params: { threadId: createdId },
            replace: true,
          })
          chatRuntimeStore.getState().requestPendingFlush(createdId)
        } catch (submissionError) {
          if (createdThreadId) takePendingSubmission(createdThreadId)
          chatRuntimeStore.getState().setActiveTurn(false)
          throw submissionError
        }
      })()
    },
    [
      canPersistThread,
      convex,
      isDraft,
      isTemporaryChatPreference,
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

  const isHeaderTemporary =
    isTemporary || (isDraft && isTemporaryChatPreference)
  const isTemporaryToggleDisabled =
    (!isDraft && !isTemporary) || convertPending || (isTemporary && isBusy)

  const handleToggleTemporaryChat = useCallback(() => {
    if (isTemporaryToggleDisabled) return

    if (isTemporary) {
      if (!hasConversation) {
        setTemporaryChat(false)
        void navigate({ to: "/" })
        return
      }
      setConvertOpen(true)
      return
    }

    setTemporaryChat(true)
  }, [
    hasConversation,
    isTemporary,
    isTemporaryToggleDisabled,
    navigate,
    setTemporaryChat,
  ])

  const handleConvert = useCallback(() => {
    if (convertPending || isBusy) return
    const messages = chatRuntimeStore.getState().getPersistableMessages()
    if (messages.length === 0) {
      setConvertOpen(false)
      setTemporaryChat(false)
      void navigate({ to: "/" })
      return
    }

    setConvertPending(true)
    void (async () => {
      try {
        const storedThreadId = await persistTemporary({ messages })
        moveThreadState(
          createThreadStateKey(user?.id, threadId),
          createThreadStateKey(user?.id, storedThreadId)
        )
        setTemporaryChat(false)
        setConvertOpen(false)
        await navigate({
          to: "/chat/$threadId",
          params: { threadId: storedThreadId },
          replace: true,
        })
        toasts.showToast({
          title: TEMPORARY_CHAT.convertedToast,
          status: "success",
        })
      } catch (error) {
        toasts.showToast({
          title:
            error instanceof Error ? error.message : "Unable to convert chat",
          status: "error",
        })
      } finally {
        setConvertPending(false)
      }
    })()
  }, [
    convertPending,
    isBusy,
    moveThreadState,
    navigate,
    persistTemporary,
    setTemporaryChat,
    threadId,
    toasts,
    user?.id,
  ])

  return (
    <LazyMotion features={domAnimation}>
      <AppSidebarProvider className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={sidebarThreads}
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
        <ChatHeaderActions
          isTemporaryChat={isHeaderTemporary}
          disabled={isTemporaryToggleDisabled}
          onToggleTemporaryChat={handleToggleTemporaryChat}
        />
        <ChatShell>
          <SidebarInset className="relative h-full min-h-0 overflow-hidden bg-background">
            <Outlet />
            <ChatShellComposer
              threadStateKey={threadStateKey}
              isDraft={isDraft}
              isTemporary={isTemporary}
              isAuthenticated={isAuthenticated && canPersistThread}
              canSubmit={
                isRouteDataReady &&
                (canPersistThread || isTemporaryChatPreference)
              }
              onDraftSubmit={activateDraftWithMessage}
              onRequireAuthentication={requireAuthentication}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
              <div className="chat-composer-horizontal-inset relative w-full">
                <AnimatedToastStack
                  toasts={toasts.toasts}
                  onDismiss={toasts.dismissToast}
                />
              </div>
            </div>
          </SidebarInset>
        </ChatShell>
        <ConvertTemporaryChatDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onConfirm={handleConvert}
          isPending={convertPending}
        />
      </AppSidebarProvider>
    </LazyMotion>
  )
}
