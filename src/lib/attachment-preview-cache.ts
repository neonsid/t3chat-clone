import type { ThreadMessageAttachment } from "@/components/chat/attachments/types"
import type { ComposerAttachment } from "@/stores/types"

const previewByAttachmentId = new Map<string, string>()
let lastSentBatch: Array<ThreadMessageAttachment> = []

export function rememberAttachmentPreview(attachmentId: string, url: string) {
  previewByAttachmentId.set(attachmentId, url)
}

export function attachmentPreviewUrl(attachmentId: string) {
  return previewByAttachmentId.get(attachmentId)
}

export function rememberComposerPreviews(
  attachments: Array<ComposerAttachment>
) {
  const items: Array<ThreadMessageAttachment> = []
  for (const attachment of attachments) {
    if (!attachment.attachmentId || attachment.status === "failed") continue
    if (attachment.localPreviewUrl) {
      rememberAttachmentPreview(
        attachment.attachmentId,
        attachment.localPreviewUrl
      )
    }
    items.push({
      attachmentId: attachment.attachmentId,
      messageId: "",
      filename: attachment.filename,
      kind: attachment.kind,
      src:
        attachment.localPreviewUrl ??
        attachmentPreviewUrl(attachment.attachmentId),
    })
  }
  lastSentBatch = items
  return items
}

export function sentAttachmentsForMessage(
  messageId: string,
  queried: Array<ThreadMessageAttachment>,
  latestUserMessageId: string | null
) {
  if (queried.length > 0) {
    return queried.map((attachment) => ({
      ...attachment,
      src: attachment.src ?? attachmentPreviewUrl(attachment.attachmentId),
    }))
  }
  if (messageId !== latestUserMessageId || lastSentBatch.length === 0) {
    return queried
  }
  return lastSentBatch.map((attachment) => ({
    ...attachment,
    messageId,
    src: attachment.src ?? attachmentPreviewUrl(attachment.attachmentId),
  }))
}
