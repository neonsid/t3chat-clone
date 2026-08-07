import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useConvexAuth, useMutation } from "convex/react"

import { api } from "../../convex/_generated/api"
import { ChatPage } from "@/components/chat/ChatPage"
import { useMountEffect } from "@/hooks/useMountEffect"

export const Route = createFileRoute("/")({ component: NewChatRoute })

function NewChatRoute() {
  const { isAuthenticated } = useConvexAuth()

  if (!isAuthenticated) return <ChatPage threadId="guest" isDraft />

  return <AuthenticatedNewChatRoute />
}

function AuthenticatedNewChatRoute() {
  const [threadId, setThreadId] = useState<string | null>(null)
  const createThread = useMutation(api.threads.createOrReuseEmpty)

  useMountEffect(() => {
    let mounted = true
    void createThread({}).then((createdThreadId) => {
      if (mounted) setThreadId(createdThreadId)
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
    />
  )
}
