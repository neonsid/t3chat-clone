export const ATTACHMENT_THUMBNAIL_CLASS = "flex h-8 w-fit max-w-full shrink-0";
export const ATTACHMENT_THUMBNAIL_FRAME_CLASS =
  "relative h-full w-fit overflow-hidden rounded-md bg-foreground/80 shadow-[0_8px_18px_rgb(0_0_0/0.35)]";

export const ATTACHMENT_SHELL = {
  root: "inline-flex max-w-full rounded-md border border-border bg-muted/40 p-2",
  failed: "border-destructive/40",
  warning: "border-amber-500/50",
} as const;

export const ATTACHMENT_THUMBNAIL_ACTION = {
  wrap: "absolute top-0.5 right-0.5 z-10",
  cancelWrap:
    "absolute top-0.5 right-0.5 z-10 opacity-0 transition-opacity group-hover/upload:opacity-100 group-focus-within/upload:opacity-100",
  button:
    "inline-flex size-5 cursor-pointer items-center justify-center rounded-md border border-border/70 bg-background/90 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
  cancelLabel: "Cancel upload",
  removeLabel: "Remove Attachment",
} as const;

export const ATTACHMENT_FILE_CHIP = {
  root: "relative flex h-8 max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-md bg-muted/50 px-2.5",
  content: "flex min-w-0 flex-1 items-center gap-2",
  contentUploading: "opacity-40",
  badge:
    "flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed border-foreground/40 text-[9px] font-semibold tracking-wide text-foreground",
  filename: "w-fit text-xs leading-4 text-foreground",
  open: "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left",
  remove:
    "relative z-10 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
  actionWrap:
    "absolute -top-2 -right-2 z-10 opacity-0 transition-opacity group-hover/upload:opacity-100 group-focus-within/upload:opacity-100",
} as const;

export const ATTACHMENT_FILE_BADGE = {
  pdf: "PDF",
  docx: "DOC",
  txt: "TXT",
} as const;

export function attachmentFileBadge(kind: string) {
  if (kind === "docx") return ATTACHMENT_FILE_BADGE.docx;
  if (kind === "txt") return ATTACHMENT_FILE_BADGE.txt;
  return ATTACHMENT_FILE_BADGE.pdf;
}

export const ATTACHMENT_UPLOAD_TOAST_ID = "composer-upload";

export const ATTACHMENT_UPLOAD_TOAST = {
  uploading: (count: number) => (count === 1 ? "Uploading 1 file" : `Uploading ${count} files`),
  failed: "Upload failed",
  someFailed: "Some uploads failed",
  ready: "Attachments ready",
  deleted: "Successfully deleted the item",
} as const;

export function attachmentUploadPercent(progress: number | undefined) {
  return Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100);
}

export const ATTACHMENT_UPLOAD_PROGRESS = {
  overlayClass: "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center",
  imageWashClass: "bg-background/45",
  percentClass: "text-[13px] font-medium tabular-nums text-foreground",
  trackClass:
    "pointer-events-none absolute bottom-2 left-1/2 z-[1] h-[3px] w-14 -translate-x-1/2 overflow-hidden rounded-md bg-foreground/20",
  fillClass: "h-full rounded-md bg-foreground transition-[width] duration-500 ease-out",
  imageClass: "h-8 w-auto max-w-full object-cover",
  imageUploadingClass: "h-8 w-auto max-w-full object-cover",
} as const;

export const ATTACHMENT_VIEWER = {
  downloadLabel: "Download",
  openLabel: "Open original",
  closeLabel: "Close",
  backdrop: "fixed inset-0 z-[300] bg-background/80",
  popup:
    "fixed inset-0 z-[300] flex items-center justify-center outline-none pointer-events-none",
  frame:
    "pointer-events-auto flex max-h-[calc(100vh-3rem)] w-max max-w-[min(56rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-md border border-border bg-card shadow-[0_16px_48px_rgb(0_0_0/0.4)]",
  header: "flex w-full shrink-0 items-center justify-between gap-4 px-5 py-3",
  title: "min-w-0 flex-1 truncate text-sm text-foreground",
  actions: "flex shrink-0 items-center gap-2",
  iconButton:
    "inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-border/70 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
  imageWrap: "flex min-h-0 items-center justify-center overflow-hidden px-5 pb-5",
  image:
    "h-auto w-auto max-h-[calc(100vh-9rem)] max-w-[min(56rem,calc(100vw-5.5rem))] object-contain",
} as const;
