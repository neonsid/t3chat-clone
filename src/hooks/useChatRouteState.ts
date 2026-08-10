import { useMatch } from "@tanstack/react-router"

export function useChatRouteState() {
  const chatMatch = useMatch({
    from: "/_chat/chat/$threadId",
    shouldThrow: false,
  })

  if (chatMatch) {
    return {
      isDraft: false,
      threadId: chatMatch.params.threadId,
    }
  }

  return {
    isDraft: true,
    threadId: "guest",
  }
}
