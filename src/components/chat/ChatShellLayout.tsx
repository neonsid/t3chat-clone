import { useUser } from "@clerk/tanstack-react-start"
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex, useConvexAuth, useMutation } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"
import { useCallback, useMemo, useState } from "react"

import { api } from "../../../convex/_generated/api"
import { ChatShellComposer } from "@/components/chat/ChatShellComposer"
import {
  ChatHeaderActions,
  ChatShell,
  SidebarControl,
} from "@/components/chat/shell/ChatShellChrome"
import { ConvertTemporaryChatDialog } from "@/components/chat/temporary-chat/ConvertTemporaryChatDialog"
import { TemporaryChatToast } from "@/components/chat/temporary-chat/TemporaryChatToast"
import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { useAnimatedToastStack } from "@/components/shared/motion/animated-toast-stack"
import { SidebarInset } from "@/components/shared/ui/sidebar"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useThreadList } from "@/hooks/useThreadList"
import { SIGN_IN_PATH } from "@/lib/auth"
import {
  createTemporarySidebarThread,
  createTemporaryThreadId,
  isTemporaryThreadId,
  storedTemporaryThreadToChatThread,
} from "@/lib/temporary-chat"
import { useChatUiStore, useSidebarUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import {
  chatRuntimeStore,
  useChatRuntimeStore,
} from "@/stores/chat-runtime-store"
import {
  temporaryThreadsStore,
  useTemporaryThreadsStore,
} from "@/stores/temporary-threads-store"

export function ChatShellLayout() {
  const navigate = useNavigate()
  const convex = useConvex()
  const persistTemporary = useMutation(api.threads.persistTemporary)
  const returnTo = useLocation({ select: (location) => location.href })
  const { user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
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
  const [convertThreadId, setConvertThreadId] = useState<string | null>(null)
  const storedTemporaryThreads = useTemporaryThreadsStore(
    (state) => state.threads
  )
  const forgottenThreadIds = useTemporaryThreadsStore(
    (state) => state.forgottenThreadIds
  )

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
    const query = searchQuery.trim().toLowerCase()
    const localThreads = Object.values(storedTemporaryThreads)
      .filter((thread) => thread.archivedAt == null)
      .filter((thread) =>
        query ? thread.title.toLowerCase().includes(query) : true
      )
      .map((thread) =>
        storedTemporaryThreadToChatThread(
          thread,
          thread.id === threadId && isBusy
        )
      )
    const hasCurrentLocal = localThreads.some(
      (thread) => thread.id === threadId
    )
    const injected =
      isTemporary &&
      !convertPending &&
      !forgottenThreadIds[threadId] &&
      (hasConversation || isBusy) &&
      !hasCurrentLocal
        ? [createTemporarySidebarThread(threadId, isBusy)]
        : []
    return [...injected, ...localThreads, ...threads]
  }, [
    convertPending,
    forgottenThreadIds,
    hasConversation,
    isBusy,
    isTemporary,
    searchQuery,
    storedTemporaryThreads,
    threadId,
    threads,
  ])

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

  const navigateAfterLeavingLocalThread = useCallback(() => {
    void navigate({ to: "/", replace: true })
  }, [navigate])

  const removeThread = useCallback(
    async (removedThreadId: string) => {
      if (isTemporaryThreadId(removedThreadId)) {
        temporaryThreadsStore.getState().removeThread(removedThreadId)
        removeThreadState(createThreadStateKey(user?.id, removedThreadId))
        if (removedThreadId !== sidebarActiveThreadId) return
        navigateAfterLeavingLocalThread()
        return
      }

      const nextThreadId = await deleteThread(removedThreadId)
      removeThreadState(createThreadStateKey(user?.id, removedThreadId))
      if (removedThreadId !== sidebarActiveThreadId) return

      await navigateAfterLeavingThread(nextThreadId)
    },
    [
      deleteThread,
      navigateAfterLeavingLocalThread,
      navigateAfterLeavingThread,
      removeThreadState,
      sidebarActiveThreadId,
      user?.id,
    ]
  )

  const archiveChat = useCallback(
    async (archivedThreadId: string) => {
      if (isTemporaryThreadId(archivedThreadId)) {
        temporaryThreadsStore.getState().archive(archivedThreadId)
        if (archivedThreadId !== sidebarActiveThreadId) return
        navigateAfterLeavingLocalThread()
        return
      }

      const nextThreadId = await archiveThread(archivedThreadId)
      if (archivedThreadId !== sidebarActiveThreadId) return

      await navigateAfterLeavingThread(nextThreadId)
    },
    [
      archiveThread,
      navigateAfterLeavingLocalThread,
      navigateAfterLeavingThread,
      sidebarActiveThreadId,
    ]
  )

  const pinChat = useCallback(
    (pinnedThreadId: string) => {
      if (isTemporaryThreadId(pinnedThreadId)) {
        temporaryThreadsStore.getState().togglePinned(pinnedThreadId)
        return
      }
      void toggleThreadPinned(pinnedThreadId)
    },
    [toggleThreadPinned]
  )

  const renameChat = useCallback(
    (renamedThreadId: string, title: string) => {
      if (isTemporaryThreadId(renamedThreadId)) {
        temporaryThreadsStore.getState().rename(renamedThreadId, title)
        return
      }
      void renameThread(renamedThreadId, title)
    },
    [renameThread]
  )

  const openConvertDialog = useCallback((targetThreadId: string) => {
    setConvertThreadId(targetThreadId)
    setConvertOpen(true)
  }, [])

  const sidebarActions = useMemo(
    () => ({
      select: openThread,
      create: createNewThread,
      delete: (id: string) => void removeThread(id),
      togglePinned: pinChat,
      archive: (id: string) => void archiveChat(id),
      rename: renameChat,
      regenerateTitle: (id: string) => void regenerateThreadTitle(id),
      convert: openConvertDialog,
    }),
    [
      archiveChat,
      createNewThread,
      openConvertDialog,
      openThread,
      pinChat,
      regenerateThreadTitle,
      removeThread,
      renameChat,
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
      setConvertThreadId(threadId)
      setConvertOpen(true)
      return
    }

    setTemporaryChat(!isTemporaryChatPreference)
  }, [
    hasConversation,
    isTemporary,
    isTemporaryChatPreference,
    isTemporaryToggleDisabled,
    navigate,
    setTemporaryChat,
  ])

  const handleConvert = useCallback(() => {
    if (convertPending || isBusy) return
    const sourceThreadId = convertThreadId ?? threadId
    const messages =
      sourceThreadId === threadId
        ? chatRuntimeStore.getState().getPersistableMessages()
        : (temporaryThreadsStore.getState().threads[sourceThreadId]?.messages ??
          [])
    if (messages.length === 0) {
      setConvertOpen(false)
      setConvertThreadId(null)
      setTemporaryChat(false)
      void navigate({ to: "/" })
      return
    }

    setConvertPending(true)
    void (async () => {
      try {
        const storedThreadId = await persistTemporary({ messages })
        temporaryThreadsStore.getState().removeThread(sourceThreadId)
        moveThreadState(
          createThreadStateKey(user?.id, sourceThreadId),
          createThreadStateKey(user?.id, storedThreadId)
        )
        setTemporaryChat(false)
        setConvertOpen(false)
        setConvertThreadId(null)
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
    convertThreadId,
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
              isAuthenticated={isAuthenticated && canPersistThread}
              canSubmit={
                isRouteDataReady &&
                (canPersistThread || isTemporaryChatPreference)
              }
              onDraftSubmit={activateDraftWithMessage}
              onRequireAuthentication={requireAuthentication}
            />
            <TemporaryChatToast
              toasts={toasts.toasts}
              onDismiss={toasts.dismissToast}
            />
          </SidebarInset>
        </ChatShell>
        <ConvertTemporaryChatDialog
          open={convertOpen}
          onOpenChange={(open) => {
            setConvertOpen(open)
            if (!open) setConvertThreadId(null)
          }}
          onConfirm={handleConvert}
          isPending={convertPending}
        />
      </AppSidebarProvider>
    </LazyMotion>
  )
}
