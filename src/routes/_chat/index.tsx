import { createFileRoute } from "@tanstack/react-router"

import { ChatThreadPanel } from "@/components/chat/ChatThreadPanel"

export const Route = createFileRoute("/_chat/")({
  component: ChatThreadPanel,
})
