import { createFileRoute } from "@tanstack/react-router"

import { ChatThreadPanel } from "@/components/chat/ChatThreadPanel"

export const Route = createFileRoute("/_chat/chat/$threadId")({
  component: ChatThreadPanel,
})
