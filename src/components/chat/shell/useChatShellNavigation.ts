import { useLocation, useNavigate } from "@tanstack/react-router"
import { useConvex } from "convex/react"
import { useCallback, useMemo, useState } from "react"

import { api } from "../../../../convex/_generated/api"
import { SIGN_IN_PATH } from "@/lib/auth"
import {
  createTemporaryThreadId,
  isTemporaryThreadId,
} from "@/lib/temporary-chat"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import { chatRuntimeStore } from "@/stores/chat-runtime-store"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"

export function useChatShellNavigation({
  userId,
  isDraft,
  isTemporaryChatPreference,
  canPersistThread,
  sidebarActiveThreadId,
  sidebarThreads,
}: {
  userId: string | undefined
  isDraft: boolean
  isTemporaryChatPreference: boolean
  canPersistThread: boolean
  sidebarActiveThreadId: string
  sidebarThreads: ReadonlyArray<{ id: string; title: string }>
}) {
  const navigate = useNavigate()
  const convex = useConvex()
  const returnTo = useLocation({ select: (location) => location.href })
  const moveThreadState = useChatUiStore((state) => state.moveThreadState)
  const queuePendingSubmission = useChatUiStore(
    (state) => state.queuePendingSubmission
  )
  const takePendingSubmission = useChatUiStore(
    (state) => state.takePendingSubmission
  )
  const removeThreadState = useChatUiStore((state) => state.removeThreadState)
  const [shareThreadId, setShareThreadId] = useState<string | null>(null)
  const [shareTitle, setShareTitle] = useState("")

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
              createThreadStateKey(userId, "guest"),
              createThreadStateKey(userId, createdThreadId)
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
            createThreadStateKey(userId, "guest"),
            createThreadStateKey(userId, createdId)
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
      userId,
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
    async (
      removedThreadId: string,
      deleteThread: (threadId: string) => Promise<string>
    ) => {
      if (isTemporaryThreadId(removedThreadId)) {
        temporaryThreadsStore.getState().removeThread(removedThreadId)
        removeThreadState(createThreadStateKey(userId, removedThreadId))
        if (removedThreadId !== sidebarActiveThreadId) return
        navigateAfterLeavingLocalThread()
        return
      }

      const nextThreadId = await deleteThread(removedThreadId)
      removeThreadState(createThreadStateKey(userId, removedThreadId))
      if (removedThreadId !== sidebarActiveThreadId) return

      await navigateAfterLeavingThread(nextThreadId)
    },
    [
      navigateAfterLeavingLocalThread,
      navigateAfterLeavingThread,
      removeThreadState,
      sidebarActiveThreadId,
      userId,
    ]
  )

  const archiveChat = useCallback(
    async (
      archivedThreadId: string,
      archiveThread: (threadId: string) => Promise<string>
    ) => {
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
      navigateAfterLeavingLocalThread,
      navigateAfterLeavingThread,
      sidebarActiveThreadId,
    ]
  )

  const pinChat = useCallback(
    (
      pinnedThreadId: string,
      toggleThreadPinned: (threadId: string) => void
    ) => {
      if (isTemporaryThreadId(pinnedThreadId)) {
        temporaryThreadsStore.getState().togglePinned(pinnedThreadId)
        return
      }
      toggleThreadPinned(pinnedThreadId)
    },
    []
  )

  const renameChat = useCallback(
    (
      renamedThreadId: string,
      title: string,
      renameThread: (threadId: string, title: string) => void
    ) => {
      if (isTemporaryThreadId(renamedThreadId)) {
        temporaryThreadsStore.getState().rename(renamedThreadId, title)
        return
      }
      renameThread(renamedThreadId, title)
    },
    []
  )

  const openShareDialog = useCallback(
    (targetThreadId: string, title?: string) => {
      if (isTemporaryThreadId(targetThreadId) || targetThreadId === "guest") {
        return
      }
      setShareThreadId(targetThreadId)
      setShareTitle(
        title ??
          sidebarThreads.find((thread) => thread.id === targetThreadId)
            ?.title ??
          "chat"
      )
    },
    [sidebarThreads]
  )

  const shareDialog = useMemo(
    () => ({
      threadId: shareThreadId,
      title: shareTitle,
      close: () => setShareThreadId(null),
    }),
    [shareThreadId, shareTitle]
  )

  return {
    openThread,
    createNewThread,
    requireAuthentication,
    activateDraftWithMessage,
    removeThread,
    archiveChat,
    pinChat,
    renameChat,
    openShareDialog,
    shareDialog,
  }
}
