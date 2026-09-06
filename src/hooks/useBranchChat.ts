import { useCallback } from "react"
import { useMutation } from "convex/react"
import { useNavigate } from "@tanstack/react-router"

import { api } from "../../convex/_generated/api"
import { showShellToast } from "@/components/chat/shell/shell-toast"
import { MESSAGE_BRANCH } from "@/components/chat/thread/constants"
import { asThreadId } from "@/lib/convex-ids"
import {
  collectBranchAttachmentIds,
  forkTemporaryThread,
  sliceMessagesThrough,
} from "@/lib/thread-branch"
import { createTemporaryThreadId } from "@/lib/temporary-chat"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"

export function useBranchChat({
  threadId,
  isTemporary,
}: {
  threadId: string
  isTemporary: boolean
}) {
  const navigate = useNavigate()
  const branchStored = useMutation(api.threads.branchFromMessage)
  const cloneAttachments = useMutation(api.attachments.cloneForBranch)

  const branchFromMessage = useCallback(
    async (messageId: string) => {
      try {
        if (isTemporary) {
          const source = temporaryThreadsStore.getState().threads[threadId]
          if (!source) return
          const sliced = sliceMessagesThrough(source.messages, messageId)
          if (!sliced) return

          const attachmentIds = collectBranchAttachmentIds(sliced)
          const attachmentIdMap =
            attachmentIds.length > 0
              ? await cloneAttachments({ attachmentIds })
              : {}

          const forked = forkTemporaryThread({
            source,
            throughMessageId: messageId,
            newThreadId: createTemporaryThreadId(),
            attachmentIdMap,
            createId: () => crypto.randomUUID(),
          })
          if (!forked) return

          temporaryThreadsStore.getState().insertThread(forked)
          await navigate({
            to: "/chat/$threadId",
            params: { threadId: forked.id },
          })
        } else {
          const createdId = await branchStored({
            threadId: asThreadId(threadId),
            messageId,
          })
          await navigate({
            to: "/chat/$threadId",
            params: { threadId: createdId },
          })
        }

        showShellToast({
          title: MESSAGE_BRANCH.branched,
          status: "success",
          duration: MESSAGE_BRANCH.toastDurationMs,
        })
      } catch {
        return
      }
    },
    [branchStored, cloneAttachments, isTemporary, navigate, threadId]
  )

  return { branchFromMessage }
}
