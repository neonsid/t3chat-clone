import { createFileRoute } from "@tanstack/react-router"

import { ChatShellLayout } from "@/components/chat/ChatShellLayout"

export const Route = createFileRoute("/_chat")({
  component: ChatShellLayout,
})
