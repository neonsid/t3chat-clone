export type ThreadMessageAttachment = {
  attachmentId: string
  messageId: string
  filename: string
  kind: "image" | "pdf" | "docx"
  src?: string
  hideDownload?: boolean
}
