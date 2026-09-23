import { useCallback, useMemo, useRef, useState } from "react"
import { useQuery } from "convex/react"

import { api } from "../../../../convex/_generated/api"
import type { ThreadMessageAttachment } from "@/components/chat/attachments/types"
import {
  rememberComposerPreviews,
  sentAttachmentsForMessage,
} from "@/lib/attachment-preview-cache"
import { asThreadId } from "@/lib/convex-ids"
import type { ComposerAttachment } from "@/stores/types"

const EMPTY_MESSAGE_ATTACHMENTS: Array<ThreadMessageAttachment> = []

export function useThreadAttachments({
  threadId,
  isAuthenticated,
  isTemporary,
}: {
  threadId: string
  isAuthenticated: boolean
  isTemporary: boolean
}) {
  const threadAttachmentDocs = useQuery(
    api.attachments.listForThreadMessages,
    isAuthenticated && threadId !== "guest" && !isTemporary
      ? { threadId: asThreadId(threadId) }
      : "skip"
  )
  const [localAttachmentsByMessageId, setLocalAttachmentsByMessageId] =
    useState<Map<string, Array<ThreadMessageAttachment>>>(() => new Map())
  const attachmentIdsByMessageRef = useRef<Record<string, string[]>>({})

  const attachmentsByMessageId = useMemo(() => {
    const grouped = new Map<string, Array<ThreadMessageAttachment>>()
    for (const attachment of threadAttachmentDocs ?? []) {
      if (!attachment.messageId) continue
      const existing = grouped.get(attachment.messageId)
      const item = {
        attachmentId: attachment.attachmentId,
        messageId: attachment.messageId,
        filename: attachment.filename,
        kind: attachment.kind,
      }
      if (existing) existing.push(item)
      else grouped.set(attachment.messageId, [item])
    }
    for (const [messageId, attachments] of localAttachmentsByMessageId) {
      if (!grouped.has(messageId) && attachments.length > 0) {
        grouped.set(messageId, attachments)
      }
    }
    return grouped
  }, [localAttachmentsByMessageId, threadAttachmentDocs])

  const recordMessageAttachments = useCallback(
    (
      messageId: string,
      attachmentIds: string[],
      composerAttachments: ComposerAttachment[]
    ) => {
      if (attachmentIds.length === 0) return
      attachmentIdsByMessageRef.current[messageId] = attachmentIds
      const items =
        composerAttachments.length > 0
          ? rememberComposerPreviews(composerAttachments).map((attachment) => ({
              ...attachment,
              messageId,
            }))
          : sentAttachmentsForMessage(
              messageId,
              EMPTY_MESSAGE_ATTACHMENTS,
              messageId
            )
      if (items.length === 0) return
      setLocalAttachmentsByMessageId((current) => {
        const next = new Map(current)
        next.set(messageId, items)
        return next
      })
    },
    []
  )

  return {
    attachmentsByMessageId,
    attachmentIdsByMessageRef,
    recordMessageAttachments,
    emptyAttachments: EMPTY_MESSAGE_ATTACHMENTS,
  }
}
