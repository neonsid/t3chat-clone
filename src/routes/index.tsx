import { useState } from "react"
import { useUser } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"
import { useConvexAuth, useMutation } from "convex/react"

import { api } from "../../convex/_generated/api"
import { ChatPage } from "@/components/chat/ChatPage"
import { useMountEffect } from "@/hooks/useMountEffect"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { createThreadStateKey } from "@/stores/chat-ui-store"

export const Route = createFileRoute("/")({ component: NewChatRoute })

function NewChatRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <ChatPage
        threadId="guest"
        isDraft
        forceGuestThread
        isRouteDataReady={false}
      />
    )
  }

  if (!isAuthenticated) return <ChatPage threadId="guest" isDraft />

  return <AuthenticatedNewChatRoute />
}

function AuthenticatedNewChatRoute() {
  const [threadId, setThreadId] = useState<string | null>(null)
  const { user } = useUser()
  const createThread = useMutation(api.threads.createOrReuseEmpty)
  const moveThreadState = useChatUiStore((state) => state.moveThreadState)

  useMountEffect(() => {
    let mounted = true
    void createThread({}).then((createdThreadId) => {
      if (!mounted) return
      moveThreadState(
        createThreadStateKey(user?.id, "guest"),
        createThreadStateKey(user?.id, createdThreadId)
      )
      setThreadId(createdThreadId)
    })

    return () => {
      mounted = false
    }
  })

  return (
    <ChatPage
      threadId={threadId ?? "guest"}
      isDraft
      forceGuestThread={threadId === null}
      isRouteDataReady={threadId !== null}
    />
  )
}
