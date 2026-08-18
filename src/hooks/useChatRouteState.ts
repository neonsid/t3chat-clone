import { useMatch } from "@tanstack/react-router"

import { isTemporaryThreadId } from "@/lib/temporary-chat"

export function useChatRouteState() {
  const chatMatch = useMatch({
    from: "/_chat/chat/$threadId",
    shouldThrow: false,
  })

  if (chatMatch) {
    const threadId = chatMatch.params.threadId
    return {
      isDraft: false,
      isTemporary: isTemporaryThreadId(threadId),
      threadId,
    }
  }

  return {
    isDraft: true,
    isTemporary: false,
    threadId: "guest",
  }
}
