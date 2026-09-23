import { useUser } from "@clerk/tanstack-react-start"
import { Outlet } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { LazyMotion, domAnimation } from "motion/react"
import { useMemo } from "react"

import { ChatShellComposer } from "@/components/chat/ChatShellComposer"
import { bindShellToast } from "@/components/chat/shell/shell-toast"
import {
  ChatHeaderActions,
  ChatShell,
  SidebarControl,
} from "@/components/chat/shell/ChatShellChrome"
import { useChatShellNavigation } from "@/components/chat/shell/useChatShellNavigation"
import { ShareThreadDialog } from "@/components/chat/share/ShareThreadDialog"
import { ConvertTemporaryChatDialog } from "@/components/chat/temporary-chat/ConvertTemporaryChatDialog"
import { TemporaryChatToast } from "@/components/chat/temporary-chat/TemporaryChatToast"
import { useTemporaryChatConversion } from "@/components/chat/temporary-chat/useTemporaryChatConversion"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { useAnimatedToastStack } from "@/components/shared/motion/animated-toast-stack"
import { SidebarInset } from "@/components/shared/ui/sidebar"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useThreadList } from "@/hooks/useThreadList"
import {
  createTemporarySidebarThread,
  storedTemporaryThreadToChatThread,
} from "@/lib/temporary-chat"
import { useChatUiStore, useSidebarUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import { useChatRuntimeStore } from "@/stores/chat-runtime-store"
import { useTemporaryThreadsStore } from "@/stores/temporary-threads-store"

export function ChatShellLayout() {
  const { user } = useUser()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const searchQuery = useSidebarUiStore((state) => state.searchQuery)
  const isTemporaryChatPreference = useChatUiStore(
    (state) => state.isTemporaryChat
  )
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
  bindShellToast(toasts.showToast)
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

  const conversion = useTemporaryChatConversion({
    userId: user?.id,
    threadId,
    isDraft,
    isTemporary,
    isTemporaryChatPreference,
    isBusy,
    hasConversation,
    showToast: toasts.showToast,
  })

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
      !conversion.convertPending &&
      !forgottenThreadIds[threadId] &&
      (hasConversation || isBusy) &&
      !hasCurrentLocal
        ? [createTemporarySidebarThread(threadId, isBusy)]
        : []
    return [...injected, ...localThreads, ...threads]
  }, [
    conversion.convertPending,
    forgottenThreadIds,
    hasConversation,
    isBusy,
    isTemporary,
    searchQuery,
    storedTemporaryThreads,
    threadId,
    threads,
  ])

  const navigation = useChatShellNavigation({
    userId: user?.id,
    isDraft,
    isTemporaryChatPreference,
    canPersistThread,
    sidebarActiveThreadId,
    sidebarThreads,
  })

  const sidebarActions = useMemo(
    () => ({
      select: navigation.openThread,
      create: navigation.createNewThread,
      delete: (id: string) => void navigation.removeThread(id, deleteThread),
      togglePinned: (id: string) => navigation.pinChat(id, toggleThreadPinned),
      archive: (id: string) => void navigation.archiveChat(id, archiveThread),
      rename: (id: string, title: string) =>
        navigation.renameChat(id, title, renameThread),
      regenerateTitle: (id: string) => void regenerateThreadTitle(id),
      convert: conversion.openConvertDialog,
      share: (id: string) => navigation.openShareDialog(id),
    }),
    [
      archiveThread,
      conversion.openConvertDialog,
      deleteThread,
      navigation,
      regenerateThreadTitle,
      renameThread,
      toggleThreadPinned,
    ]
  )

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
          onCreateThread={navigation.createNewThread}
        />
        <ChatHeaderActions
          isTemporaryChat={conversion.isHeaderTemporary}
          disabled={conversion.isTemporaryToggleDisabled}
          showShare={
            hasConversation &&
            !isTemporary &&
            !isDraft &&
            isAuthenticated &&
            canPersistThread
          }
          onShare={() => navigation.openShareDialog(threadId)}
          onToggleTemporaryChat={conversion.handleToggleTemporaryChat}
        />
        <ChatShell>
          <SidebarInset className="chat-pane relative h-full min-h-0 overflow-hidden bg-background">
            <Outlet />
            <ChatShellComposer
              threadStateKey={threadStateKey}
              isDraft={isDraft}
              isAuthenticated={isAuthenticated && canPersistThread}
              canSubmit={
                isRouteDataReady &&
                (canPersistThread || isTemporaryChatPreference)
              }
              onDraftSubmit={navigation.activateDraftWithMessage}
              onRequireAuthentication={navigation.requireAuthentication}
            />
            <TemporaryChatToast toasts={toasts.toasts} />
          </SidebarInset>
        </ChatShell>
        <ConvertTemporaryChatDialog
          open={conversion.convertOpen}
          onOpenChange={(open) => {
            conversion.setConvertOpen(open)
            if (!open) conversion.setConvertThreadId(null)
          }}
          onConfirm={conversion.handleConvert}
          isPending={conversion.convertPending}
        />
        <ShareThreadDialog
          open={navigation.shareDialog.threadId != null}
          threadId={navigation.shareDialog.threadId}
          threadTitle={navigation.shareDialog.title}
          onOpenChange={(open) => {
            if (!open) navigation.shareDialog.close()
          }}
        />
      </AppSidebarProvider>
    </LazyMotion>
  )
}
