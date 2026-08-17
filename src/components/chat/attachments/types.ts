export type ThreadMessageAttachment = {
  attachmentId: string
  messageId: string
  filename: string
  kind: "image" | "pdf"
  src?: string
}
