export const ATTACHMENT_THUMBNAIL_ACTION = {
  cancelLabel: "Cancel upload",
  removeLabel: "Remove Attachment",
} as const

export const ATTACHMENT_FILE_BADGE = {
  pdf: "PDF",
  docx: "DOC",
  txt: "TXT",
} as const

export function attachmentFileBadge(kind: string) {
  if (kind === "docx") return ATTACHMENT_FILE_BADGE.docx
  if (kind === "txt") return ATTACHMENT_FILE_BADGE.txt
  return ATTACHMENT_FILE_BADGE.pdf
}

export const ATTACHMENT_UPLOAD_TOAST_ID = "composer-upload"

export const ATTACHMENT_UPLOAD_TOAST = {
  uploading: (count: number) =>
    count === 1 ? "Uploading 1 file" : `Uploading ${count} files`,
  failed: "Upload failed",
  someFailed: "Some uploads failed",
  ready: "Attachments ready",
  deleted: "Successfully deleted the item",
} as const

export function attachmentUploadPercent(progress: number | undefined) {
  return Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100)
}

export const ATTACHMENT_VIEWER = {
  downloadLabel: "Download",
  openLabel: "Open original",
  closeLabel: "Close",
} as const
