export const ATTACHMENT_THUMBNAIL_CLASS = "size-12 shrink-0"

export const ATTACHMENT_THUMBNAIL_FRAME_CLASS =
  "size-full overflow-hidden rounded-lg border bg-muted shadow-[0_8px_18px_rgb(0_0_0/0.35)]"

export const ATTACHMENT_THUMBNAIL_ACTION = {
  wrap: "absolute top-0.5 right-0.5 z-10",
  button:
    "inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground disabled:opacity-50",
  cancelLabel: "Cancel upload",
  removeLabel: "Remove",
} as const

export const ATTACHMENT_FILE_CHIP = {
  root: "relative flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border bg-muted/50 py-1.5 pr-1.5 pl-2",
  badge:
    "flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-foreground/40 text-[9px] font-semibold tracking-wide text-foreground",
  filename: "min-w-0 flex-1 truncate text-sm leading-5 text-foreground",
  remove:
    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50",
} as const

export const ATTACHMENT_UPLOAD_TOAST_ID = "composer-upload"

export const ATTACHMENT_UPLOAD_TOAST_GAP_FROM_ATTACH = "ml-[5px]"

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
    "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/35 backdrop-blur-[2px]",
  percentClass: "text-xs font-medium tabular-nums text-foreground",
  trackClass:
    "pointer-events-none absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-background/70",
  fillClass: "h-full rounded-full bg-foreground",
  imageClass: "size-full object-cover",
  imageUploadingClass: "size-full object-cover",
} as const

export const ATTACHMENT_VIEWER = {
  downloadLabel: "Download",
  openLabel: "Open original",
  closeLabel: "Close",
} as const
