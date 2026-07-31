import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { useMountEffect } from "@/hooks/useMountEffect"
import { useThreads } from "@/hooks/useThreads"

export const Route = createFileRoute("/")({ component: NewChatRoute })

function NewChatRoute() {
  const navigate = useNavigate()
  const { createThread } = useThreads()

  useMountEffect(() => {
    const thread = createThread()
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: thread.id },
      replace: true,
    })
  })

  return <div className="h-dvh bg-background" />
}
