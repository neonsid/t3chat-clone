import { useCallback } from "react"
import { useMutation } from "convex/react"

import { api } from "../../convex/_generated/api"
import { asThreadId } from "@/lib/convex-ids"
import { truncateTemporaryThreadForRetry } from "@/lib/thread-retry"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"

export function useRetryChat({
  threadId,
  isTemporary,
}: {
  threadId: string
  isTemporary: boolean
}) {
  const truncateStored = useMutation(api.threads.truncateFromMessage)

  const truncateForRetry = useCallback(
    async (assistantMessageId: string) => {
      if (isTemporary) {
        const source = temporaryThreadsStore.getState().threads[threadId]
        if (!source) return false
        const next = truncateTemporaryThreadForRetry({
          source,
          assistantMessageId,
        })
        if (!next) return false
        temporaryThreadsStore.getState().insertThread(next)
        return true
      }

      await truncateStored({
        threadId: asThreadId(threadId),
        messageId: assistantMessageId,
      })
      return true
    },
    [isTemporary, threadId, truncateStored]
  )

  return { truncateForRetry }
}
