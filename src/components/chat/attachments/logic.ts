import {
  ATTACHMENT_THUMBNAIL_ACTION,
  attachmentFileBadge,
} from "@/components/chat/attachments/constants"
import type { ComposerAttachment } from "@/stores/types"

export type ComposerAttachmentPresentation = {
  filename: string
  kind: ComposerAttachment["kind"]
  badge: string
  previewUrl: string | undefined
  isUploading: boolean
  progress: number
  canOpen: boolean
  failed: boolean
  warning: boolean
  statusLabel: string | undefined
  fileStatusLabel: string | undefined
  removeLabel: string
}

export function resolveComposerAttachmentPresentation(
  attachment: ComposerAttachment
): ComposerAttachmentPresentation {
  const isUploading =
    attachment.status === "preparing" ||
    attachment.status === "uploading" ||
    attachment.status === "processing"
  const failed = attachment.status === "failed"
  const warning = Boolean(attachment.contextWarning)
  const previewUrl = attachment.localPreviewUrl
  const statusLabel = composerStatusLabel(attachment)
  const showFileStatus = failed || warning

  return {
    filename: attachment.filename,
    kind: attachment.kind,
    badge: attachmentFileBadge(attachment.kind),
    previewUrl,
    isUploading,
    progress: attachment.status === "processing" ? 1 : attachment.progress,
    canOpen: attachment.kind === "image" && Boolean(previewUrl),
    failed,
    warning,
    statusLabel,
    fileStatusLabel: showFileStatus ? statusLabel : undefined,
    removeLabel: isUploading
      ? ATTACHMENT_THUMBNAIL_ACTION.cancelLabel
      : ATTACHMENT_THUMBNAIL_ACTION.removeLabel,
  }
}

function composerStatusLabel(attachment: ComposerAttachment) {
  if (attachment.kind === "image" && attachment.status !== "failed") {
    return undefined
  }
  if (attachment.status === "failed") {
    return attachment.errorMessage ?? "Failed"
  }
  if (attachment.contextWarning) return attachment.contextWarning
  if (attachment.status === "processing") return "Processing…"
  return undefined
}
