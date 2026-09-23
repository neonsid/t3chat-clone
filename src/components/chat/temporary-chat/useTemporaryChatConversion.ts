import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useCallback, useState } from "react"

import { api } from "../../../../convex/_generated/api"
import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants"
import { createThreadStateKey } from "@/stores/chat-ui-store"
import { chatRuntimeStore } from "@/stores/chat-runtime-store"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"

export function useTemporaryChatConversion({
  userId,
  threadId,
  isDraft,
  isTemporary,
  isTemporaryChatPreference,
  isBusy,
  hasConversation,
  showToast,
}: {
  userId: string | undefined
  threadId: string
  isDraft: boolean
  isTemporary: boolean
  isTemporaryChatPreference: boolean
  isBusy: boolean
  hasConversation: boolean
  showToast: (toast: { title: string; status: "success" | "error" }) => void
}) {
  const navigate = useNavigate()
  const persistTemporary = useMutation(api.threads.persistTemporary)
  const setTemporaryChat = useChatUiStore((state) => state.setTemporaryChat)
  const moveThreadState = useChatUiStore((state) => state.moveThreadState)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertPending, setConvertPending] = useState(false)
  const [convertThreadId, setConvertThreadId] = useState<string | null>(null)

  const isHeaderTemporary =
    isTemporary || (isDraft && isTemporaryChatPreference)
  const isTemporaryToggleDisabled =
    (!isDraft && !isTemporary) || convertPending || (isTemporary && isBusy)

  const openConvertDialog = useCallback((targetThreadId: string) => {
    setConvertThreadId(targetThreadId)
    setConvertOpen(true)
  }, [])

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
    threadId,
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
          createThreadStateKey(userId, sourceThreadId),
          createThreadStateKey(userId, storedThreadId)
        )
        setTemporaryChat(false)
        setConvertOpen(false)
        setConvertThreadId(null)
        await navigate({
          to: "/chat/$threadId",
          params: { threadId: storedThreadId },
          replace: true,
        })
        showToast({
          title: TEMPORARY_CHAT.convertedToast,
          status: "success",
        })
      } catch (error) {
        showToast({
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
    showToast,
    threadId,
    userId,
  ])

  return {
    convertOpen,
    convertPending,
    convertThreadId,
    isHeaderTemporary,
    isTemporaryToggleDisabled,
    openConvertDialog,
    setConvertOpen,
    setConvertThreadId,
    handleToggleTemporaryChat,
    handleConvert,
  }
}
