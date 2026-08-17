import { XIcon } from "lucide-react"

import {
  ATTACHMENT_FILE_CHIP,
  ATTACHMENT_UPLOAD_PROGRESS,
} from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

export function AttachmentFileChip({
  filename,
  statusLabel,
  failed,
  progress,
  indeterminate,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  statusLabel?: string
  failed?: boolean
  progress?: number
  indeterminate?: boolean
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const percent = Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100)
  const showProgress = indeterminate || (progress !== undefined && progress < 1)

  const body = (
    <div
      className={cn(
        ATTACHMENT_FILE_CHIP.root,
        failed ? "border-destructive/40" : "border-border/70"
      )}
    >
      {onOpen ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Open ${filename}`}
          onClick={onOpen}
        >
          <span className={ATTACHMENT_FILE_CHIP.badge}>PDF</span>
          <span className={ATTACHMENT_FILE_CHIP.filename} title={filename}>
            {filename}
          </span>
        </button>
      ) : (
        <>
          <span className={ATTACHMENT_FILE_CHIP.badge}>PDF</span>
          <span className={ATTACHMENT_FILE_CHIP.filename} title={filename}>
            {filename}
          </span>
        </>
      )}
      {statusLabel ? (
        <span
          className={cn(
            "shrink-0 text-[10px] leading-4",
            failed ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {statusLabel}
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${filename}`}
          disabled={removeDisabled}
          onClick={onRemove}
          className={ATTACHMENT_FILE_CHIP.remove}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
      {showProgress ? (
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
    </div>
  )

  if (failed && statusLabel) {
    return <Tooltip content={statusLabel}>{body}</Tooltip>
  }

  return body
}
