export const ATTACHMENT_THUMBNAIL_CLASS = "size-16 shrink-0"

export const ATTACHMENT_UPLOAD_TOAST_ID = "composer-upload"

export const ATTACHMENT_UPLOAD_TOAST = {
  uploading: (count: number) =>
    count === 1 ? "Uploading 1 file" : `Uploading ${count} files`,
  failed: "Upload failed",
  someFailed: "Some uploads failed",
  ready: "Attachments ready",
  deleted: "Successfully deleted the item",
} as const

export const ATTACHMENT_UPLOAD_PROGRESS = {
  overlayClass:
    "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50",
  percentClass: "text-xs font-medium tabular-nums text-foreground",
  trackClass:
    "pointer-events-none absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-background/70",
  fillClass: "h-full rounded-full bg-foreground",
} as const

export const ATTACHMENT_VIEWER = {
  downloadLabel: "Download",
  openLabel: "Open original",
  closeLabel: "Close",
} as const
