import { createFileRoute } from "@tanstack/react-router"

import { ChatPage } from "@/components/chat/ChatPage"

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadRoute,
})

function ChatThreadRoute() {
  const { threadId } = Route.useParams()
  return <ChatPage threadId={threadId} />
}
