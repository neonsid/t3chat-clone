import { FileTextIcon, XIcon } from "lucide-react"

import {
  ATTACHMENT_THUMBNAIL_CLASS,
  ATTACHMENT_UPLOAD_PROGRESS,
} from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

function uploadPercent(progress: number | undefined) {
  return Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100)
}

export function AttachmentThumbnail({
  filename,
  kind,
  src,
  statusLabel,
  failed,
  progress,
  indeterminate,
  showPercent,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  kind: "image" | "pdf"
  src?: string
  statusLabel?: string
  failed?: boolean
  progress?: number
  indeterminate?: boolean
  showPercent?: boolean
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const percent = uploadPercent(progress)
  const preview =
    kind === "image" && src ? (
      <img src={src} alt="" className="size-full object-cover" />
    ) : (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <FileTextIcon className="size-5" />
      </div>
    )

  const body = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-muted",
        ATTACHMENT_THUMBNAIL_CLASS,
        failed ? "border-destructive/40" : "border-border/70"
      )}
    >
      {onOpen ? (
        <button
          type="button"
          className="size-full cursor-zoom-in"
          aria-label={`View ${filename}`}
          onClick={onOpen}
        >
          {preview}
        </button>
      ) : (
        preview
      )}
      {statusLabel ? (
        <p
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-center text-[10px] leading-4",
            failed
              ? "bg-destructive/80 text-destructive-foreground"
              : "bg-background/80 text-muted-foreground"
          )}
        >
          {statusLabel}
        </p>
      ) : null}
      {showPercent ? (
        <>
          <div className={ATTACHMENT_UPLOAD_PROGRESS.overlayClass}>
            <span className={ATTACHMENT_UPLOAD_PROGRESS.percentClass}>
              {indeterminate ? "0%" : `${percent}%`}
            </span>
          </div>
          <div className={ATTACHMENT_UPLOAD_PROGRESS.trackClass}>
            <div
              className={cn(
                ATTACHMENT_UPLOAD_PROGRESS.fillClass,
                indeterminate && "w-1/3 animate-pulse"
              )}
              style={indeterminate ? undefined : { width: `${percent}%` }}
            />
          </div>
        </>
      ) : indeterminate || (progress !== undefined && progress < 1) ? (
        <div className={ATTACHMENT_UPLOAD_PROGRESS.trackClass}>
          <div
            className={cn(
              ATTACHMENT_UPLOAD_PROGRESS.fillClass,
              indeterminate && "w-1/3 animate-pulse"
            )}
            style={indeterminate ? undefined : { width: `${percent}%` }}
          />
        </div>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${filename}`}
          disabled={removeDisabled}
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </div>
  )

  if (failed && statusLabel) {
    return <Tooltip content={statusLabel}>{body}</Tooltip>
  }

  return body
}
