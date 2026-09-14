import type { AttachmentKind } from "@/lib/attachment-limits"

export type ThreadMessageAttachment = {
  attachmentId: string
  messageId: string
  filename: string
  kind: AttachmentKind
  src?: string
  hideDownload?: boolean
}
