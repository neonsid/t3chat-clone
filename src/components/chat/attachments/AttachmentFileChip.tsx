import { BanIcon, XIcon } from "lucide-react"

import { AttachmentShell } from "@/components/chat/attachments/AttachmentShell"
import {
  ATTACHMENT_THUMBNAIL_ACTION,
  attachmentUploadPercent,
} from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

const removeButtonClassName = cn(
  "inline-flex size-5 cursor-pointer items-center justify-center rounded-md border",
  "border-border/70 bg-background/90 text-muted-foreground shadow-sm",
  "hover:bg-accent hover:text-foreground",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

const removeWrapClassName = cn(
  "absolute -top-2 -right-2 z-10 opacity-0 transition-opacity",
  "group-focus-within/upload:opacity-100 group-hover/upload:opacity-100"
)

export function AttachmentFileChip({
  filename,
  badge = "PDF",
  statusLabel,
  failed,
  warning,
  uploading,
  progress,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  badge?: string
  statusLabel?: string
  failed?: boolean
  warning?: boolean
  uploading?: boolean
  progress?: number
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const percent = attachmentUploadPercent(progress)

  const label = (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        uploading && "opacity-40"
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border",
          "border-dashed border-foreground/40 text-[9px] font-semibold tracking-wide text-foreground"
        )}
      >
        {badge}
      </span>
      <span
        className="w-fit text-xs leading-4 text-foreground"
        title={filename}
      >
        {filename}
      </span>
    </span>
  )

  const chip = (
    <AttachmentShell
      className="group/upload relative"
      failed={failed}
      warning={warning}
    >
      <div
        className={cn(
          "relative flex h-8 max-w-full min-w-0 items-center gap-2 px-2.5",
          "overflow-hidden rounded-md bg-muted/50"
        )}
      >
        {onOpen && !uploading ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
            aria-label={`Open ${filename}`}
            onClick={onOpen}
          >
            {label}
          </button>
        ) : (
          label
        )}
        {uploading ? <UploadProgressOverlay percent={percent} /> : null}
      </div>
      {onRemove ? (
        <AttachmentRemoveButton
          uploading={Boolean(uploading)}
          disabled={removeDisabled}
          onClick={onRemove}
        />
      ) : null}
    </AttachmentShell>
  )

  if ((failed || warning) && statusLabel) {
    return <Tooltip content={statusLabel}>{chip}</Tooltip>
  }

  return chip
}

export function AttachmentRemoveButton({
  uploading,
  disabled,
  onClick,
}: {
  uploading: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const removeLabel = uploading
    ? ATTACHMENT_THUMBNAIL_ACTION.cancelLabel
    : ATTACHMENT_THUMBNAIL_ACTION.removeLabel

  return (
    <Tooltip wrapperClassName={removeWrapClassName} content={removeLabel}>
      <button
        type="button"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onClick}
        className={removeButtonClassName}
      >
        {uploading ? (
          <BanIcon className="size-3" />
        ) : (
          <XIcon className="size-3" />
        )}
      </button>
    </Tooltip>
  )
}

export function UploadProgressOverlay({
  percent,
  wash,
}: {
  percent: number
  wash?: boolean
}) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center",
          wash && "bg-background/45"
        )}
      >
        <span className="text-[13px] font-medium text-foreground tabular-nums">
          {percent}%
        </span>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute bottom-2 left-1/2 z-[1] h-[3px] w-14",
          "-translate-x-1/2 overflow-hidden rounded-md bg-foreground/20"
        )}
      >
        <div
          className="h-full rounded-md bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  )
}
